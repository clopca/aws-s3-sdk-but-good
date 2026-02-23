import type {
  BrowserAction,
  BrowserActionPayload,
  BrowserActionResponse,
  BrowserFile,
  BrowserFolder,
  BrowserItem,
  BrowserListFilters,
  S3Config,
} from "@s3-good/shared";
import type { BrowserHandlerConfig, BrowserRouteConfig } from "./browser-types";
import {
  copyObject,
  deleteObject,
  deleteObjects,
  generatePresignedGetUrl,
  getS3Client,
  listObjects,
  putEmptyObject,
} from "./s3";

const ALL_ACTIONS: BrowserAction[] = [
  "list",
  "delete",
  "delete-many",
  "rename",
  "move",
  "copy",
  "create-folder",
  "get-download-url",
  "get-preview-url",
];

const PAGE_SIZE_DEFAULT = 100;
const PAGE_SIZE_MAX = 1000;

export class BrowserError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "BrowserError";
  }
}

function getNameFromKey(key: string): string {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const segments = trimmed.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? key;
}

function resolveActionValue(raw: string | null): BrowserAction {
  if (!raw) return "list";
  if (ALL_ACTIONS.includes(raw as BrowserAction)) return raw as BrowserAction;
  throw new BrowserError(`Unknown action: ${raw}`, 400);
}

function normalizeRootPrefix(prefix?: string): string | undefined {
  if (!prefix) return undefined;
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function enforceRootPrefix(value: string, rootPrefix?: string): string {
  const normalizedRoot = normalizeRootPrefix(rootPrefix);
  if (!normalizedRoot) return value;
  if (!value.startsWith(normalizedRoot)) {
    throw new BrowserError("Path is outside the configured root prefix", 403);
  }
  return value;
}

function destinationKeyForPath(sourceKey: string, destination: string): string {
  if (destination.endsWith("/")) {
    return `${destination}${getNameFromKey(sourceKey)}`;
  }
  return destination;
}

function validateAction(
  action: BrowserAction,
  allowedActions?: BrowserAction[],
): void {
  const allowed = allowedActions ?? ALL_ACTIONS;
  if (!allowed.includes(action)) {
    throw new BrowserError(`Action \"${action}\" is not allowed`, 403);
  }
}

function makeFileItem(
  key: string,
  size: number,
  lastModified: Date,
  etag?: string,
): BrowserFile {
  return {
    kind: "file",
    key,
    name: getNameFromKey(key),
    size,
    lastModified,
    contentType: "application/octet-stream",
    etag,
  };
}

function makeFolderItem(key: string): BrowserFolder {
  return {
    kind: "folder",
    key,
    name: getNameFromKey(key),
  };
}

function applySearchFilter(items: BrowserItem[], search?: string): BrowserItem[] {
  if (!search) return items;
  const query = search.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(query));
}

function requireKey(payload: BrowserActionPayload): string {
  if (!payload.key) {
    throw new BrowserError("Missing key", 400);
  }
  return payload.key;
}

function requireDestination(payload: BrowserActionPayload): string {
  if (!payload.destination) {
    throw new BrowserError("Missing destination", 400);
  }
  return payload.destination;
}

function resolveBucket(payload: BrowserActionPayload, route: BrowserRouteConfig, config: S3Config): string {
  const allowedBuckets = route.buckets?.length ? route.buckets : [config.bucket];
  const defaultBucket = route.defaultBucket ?? allowedBuckets[0] ?? config.bucket;
  const requestedBucket = payload.bucket ?? defaultBucket;

  if (!allowedBuckets.includes(requestedBucket)) {
    throw new BrowserError("Bucket is not allowed", 403);
  }

  return requestedBucket;
}

function resolveListFilters(payload: BrowserActionPayload): BrowserListFilters {
  const filters: BrowserListFilters = payload.filters ? { ...payload.filters } : {};

  if (!filters.prefix && payload.prefix) {
    filters.prefix = payload.prefix;
  }

  if (!filters.search && payload.search) {
    filters.search = payload.search;
  }

  return filters;
}

function validateListFilters(filters: BrowserListFilters): void {
  if (filters.tags && filters.tags.length > 0) {
    throw new BrowserError("Tag filtering is not available without Athena", 400);
  }
}

export async function parseBrowserRequest(
  req: Request,
): Promise<BrowserActionPayload> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const contentTypes = url.searchParams.get("contentTypes");

    return {
      action: resolveActionValue(url.searchParams.get("action")),
      bucket: url.searchParams.get("bucket") ?? undefined,
      prefix: url.searchParams.get("prefix") ?? undefined,
      continuationToken: url.searchParams.get("continuationToken") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      filters: {
        prefix: url.searchParams.get("prefix") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
        contentTypes: contentTypes
          ? contentTypes.split(",").map((value) => value.trim()).filter(Boolean)
          : undefined,
      },
    };
  }

  const body = (await req.json()) as BrowserActionPayload;
  if (!body.action) {
    throw new BrowserError("Missing action", 400);
  }
  return {
    ...body,
    action: resolveActionValue(body.action),
  };
}

async function handleList(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  route: BrowserRouteConfig,
): Promise<BrowserActionResponse> {
  const filters = resolveListFilters(payload);
  validateListFilters(filters);
  const prefix = enforceRootPrefix(filters.prefix ?? route.rootPrefix ?? "", route.rootPrefix);

  const pageSize = Math.max(
    1,
    Math.min(route.pageSize ?? PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX),
  );

  const result = await listObjects(s3, {
    bucket,
    prefix,
    continuationToken: payload.cursor ?? payload.continuationToken,
    maxKeys: pageSize,
  });

  const files = result.objects.map((obj) =>
    makeFileItem(obj.key, obj.size, obj.lastModified, obj.etag),
  );
  const folders = result.folders.map((folder) => makeFolderItem(folder));

  const search = filters.search ?? payload.search;

  return {
    action: "list",
    success: true,
    items: applySearchFilter([...folders, ...files], search),
    nextContinuationToken: result.nextContinuationToken,
    nextCursor: result.nextContinuationToken,
    isTruncated: result.isTruncated,
    meta: { mode: "s3-list", bucket },
  };
}

async function handleDelete(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  const key = enforceRootPrefix(requireKey(payload), rootPrefix);
  await deleteObject(s3, {
    bucket,
    key,
  });
  return {
    action: "delete",
    success: true,
    deleted: [key],
  };
}

async function handleDeleteMany(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  if (!payload.keys || payload.keys.length === 0) {
    throw new BrowserError("Missing keys", 400);
  }

  const keys = payload.keys.map((key) => enforceRootPrefix(key, rootPrefix));
  const result = await deleteObjects(s3, {
    bucket,
    keys,
  });

  return {
    action: "delete-many",
    success: result.errors.length === 0,
    deleted: result.deleted,
    error: result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
  };
}

async function handleRename(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  const key = enforceRootPrefix(requireKey(payload), rootPrefix);
  if (!payload.newName) {
    throw new BrowserError("Missing newName", 400);
  }

  const slash = key.lastIndexOf("/");
  const parentPrefix = slash >= 0 ? key.slice(0, slash + 1) : "";
  const destinationKey = `${parentPrefix}${payload.newName}`;

  await copyObject(s3, {
    bucket,
    sourceKey: key,
    destinationKey,
  });
  await deleteObject(s3, {
    bucket,
    key,
  });

  return {
    action: "rename",
    success: true,
  };
}

async function handleMoveOrCopy(
  action: "move" | "copy",
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  const key = enforceRootPrefix(requireKey(payload), rootPrefix);
  const destination = enforceRootPrefix(requireDestination(payload), rootPrefix);
  const destinationKey = destinationKeyForPath(key, destination);

  await copyObject(s3, {
    bucket,
    sourceKey: key,
    destinationKey,
  });

  if (action === "move") {
    await deleteObject(s3, {
      bucket,
      key,
    });
  }

  return {
    action,
    success: true,
  };
}

async function handleCreateFolder(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  if (!payload.folderName) {
    throw new BrowserError("Missing folderName", 400);
  }
  const basePrefix = enforceRootPrefix(payload.prefix ?? rootPrefix ?? "", rootPrefix);
  const normalizedBase = basePrefix === "" || basePrefix.endsWith("/")
    ? basePrefix
    : `${basePrefix}/`;
  const folderKey = `${normalizedBase}${payload.folderName}/`;

  await putEmptyObject(s3, {
    bucket,
    key: folderKey,
  });

  return {
    action: "create-folder",
    success: true,
  };
}

async function handleGetUrl(
  action: "get-download-url" | "get-preview-url",
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  const key = enforceRootPrefix(requireKey(payload), rootPrefix);
  const url = await generatePresignedGetUrl(s3, {
    bucket,
    key,
    forceDownload: action === "get-download-url",
  });

  return {
    action,
    success: true,
    url,
  };
}

async function executeAction(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  route: BrowserRouteConfig,
): Promise<BrowserActionResponse> {
  switch (payload.action) {
    case "list":
      return handleList(s3, bucket, payload, route);
    case "delete":
      return handleDelete(s3, bucket, payload, route.rootPrefix);
    case "delete-many":
      return handleDeleteMany(s3, bucket, payload, route.rootPrefix);
    case "rename":
      return handleRename(s3, bucket, payload, route.rootPrefix);
    case "move":
      return handleMoveOrCopy("move", s3, bucket, payload, route.rootPrefix);
    case "copy":
      return handleMoveOrCopy("copy", s3, bucket, payload, route.rootPrefix);
    case "create-folder":
      return handleCreateFolder(s3, bucket, payload, route.rootPrefix);
    case "get-download-url":
      return handleGetUrl("get-download-url", s3, bucket, payload, route.rootPrefix);
    case "get-preview-url":
      return handleGetUrl("get-preview-url", s3, bucket, payload, route.rootPrefix);
    default:
      throw new BrowserError(`Unknown action: ${payload.action}`, 400);
  }
}

export async function handleBrowserAction(
  req: Request,
  handlerConfig: BrowserHandlerConfig,
): Promise<Response> {
  let action: BrowserAction = "list";

  try {
    const payload = await parseBrowserRequest(req);
    action = payload.action;

    validateAction(payload.action, handlerConfig.route.allowedActions);

    let metadata: unknown = undefined;
    if (handlerConfig.route.middleware) {
      metadata = await handlerConfig.route.middleware({
        req,
        action: payload.action,
        payload,
      });
    }

    if (handlerConfig.route.permissions) {
      const allowed = await handlerConfig.route.permissions({
        action: payload.action,
        payload,
        metadata,
      });
      if (!allowed) {
        throw new BrowserError("Permission denied", 403);
      }
    }

    const bucket = resolveBucket(payload, handlerConfig.route, handlerConfig.config);
    const s3 = getS3Client(handlerConfig.config);
    const response = await executeAction(s3, bucket, payload, handlerConfig.route);
    return Response.json(response);
  } catch (error) {
    if (error instanceof BrowserError) {
      return Response.json(
        {
        action,
        success: false,
        error: error.message,
      } satisfies BrowserActionResponse,
        { status: error.status },
      );
    }

    console.error("[s3-good/browser] Internal error:", error);
    return Response.json(
      {
        action,
        success: false,
        error: "Internal server error",
      } satisfies BrowserActionResponse,
      { status: 500 },
    );
  }
}
