import type {
  BrowserAction,
  BrowserActionPayload,
  BrowserActionResponse,
  BrowserFile,
  BrowserFolder,
  BrowserItem,
  BrowserListFilters,
  S3Config,
} from "@s3-good-internal/shared";
import { getMimeType } from "@s3-good-internal/shared";
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

function normalizeFolderPrefix(key: string): string {
  return key.endsWith("/") ? key : `${key}/`;
}

function destinationPrefixForFolder(
  sourcePrefix: string,
  destination: string,
): string {
  if (destination.endsWith("/")) {
    return `${destination}${getNameFromKey(sourcePrefix)}/`;
  }
  return normalizeFolderPrefix(destination);
}

function mapFolderObjectKey(
  sourcePrefix: string,
  destinationPrefix: string,
  key: string,
): string {
  return `${destinationPrefix}${key.slice(sourcePrefix.length)}`;
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
  const inferredContentType = getMimeType(getNameFromKey(key));

  return {
    kind: "file",
    key,
    name: getNameFromKey(key),
    size,
    lastModified,
    contentType: inferredContentType,
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

function applySearchFilter(
  items: BrowserItem[],
  search?: string,
): BrowserItem[] {
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

function sanitizePathSegment(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BrowserError(`${fieldName} cannot be empty`, 400);
  }

  // Reject path separators to prevent writing outside the intended directory.
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    throw new BrowserError(
      `${fieldName} must not contain path separators`,
      400,
    );
  }

  // Reject traversal sequences to prevent escaping the root prefix boundary.
  if (trimmed === "." || trimmed === ".." || trimmed.includes("..")) {
    throw new BrowserError(
      `${fieldName} must not contain path traversal sequences`,
      400,
    );
  }

  return trimmed;
}

function resolveBucket(
  payload: BrowserActionPayload,
  route: BrowserRouteConfig,
  config: S3Config,
): string {
  const allowedBuckets = route.buckets?.length
    ? route.buckets
    : [config.bucket];
  const defaultBucket =
    route.defaultBucket ?? allowedBuckets[0] ?? config.bucket;
  const requestedBucket = payload.bucket ?? defaultBucket;

  if (!allowedBuckets.includes(requestedBucket)) {
    throw new BrowserError("Bucket is not allowed", 403);
  }

  return requestedBucket;
}

function resolveAllowedBuckets(
  route: BrowserRouteConfig,
  config: S3Config,
): string[] {
  return route.buckets?.length ? route.buckets : [config.bucket];
}

function resolveListFilters(payload: BrowserActionPayload): BrowserListFilters {
  const filters: BrowserListFilters = payload.filters
    ? { ...payload.filters }
    : {};

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
    throw new BrowserError(
      "Tag filtering is not available without Athena",
      400,
    );
  }
}

async function listAllObjectKeysInPrefix(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await listObjects(s3, {
      bucket,
      prefix,
      delimiter: "",
      continuationToken,
      maxKeys: PAGE_SIZE_MAX,
    });
    keys.push(...page.objects.map((obj) => obj.key));
    continuationToken = page.nextContinuationToken;
    if (!page.isTruncated) break;
  } while (continuationToken);

  return keys;
}

async function copyFolderPrefix(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  sourcePrefix: string,
  destinationPrefix: string,
): Promise<string[]> {
  const keys = await listAllObjectKeysInPrefix(s3, bucket, sourcePrefix);
  if (keys.length === 0) {
    await putEmptyObject(s3, { bucket, key: destinationPrefix });
    return [];
  }

  for (const sourceKey of keys) {
    await copyObject(s3, {
      bucket,
      sourceKey,
      destinationKey: mapFolderObjectKey(
        sourcePrefix,
        destinationPrefix,
        sourceKey,
      ),
    });
  }

  return keys;
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
          ? contentTypes
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
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
  config: S3Config,
  bucket: string,
  payload: BrowserActionPayload,
  route: BrowserRouteConfig,
): Promise<BrowserActionResponse> {
  const filters = resolveListFilters(payload);
  validateListFilters(filters);
  const prefix = enforceRootPrefix(
    filters.prefix ?? route.rootPrefix ?? "",
    route.rootPrefix,
  );

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

  const allowedBuckets = resolveAllowedBuckets(route, config);
  const defaultBucket = route.defaultBucket ?? allowedBuckets[0] ?? bucket;
  const meta = {
    mode: "s3-list",
    bucket,
    buckets: allowedBuckets,
    defaultBucket,
  } as BrowserActionResponse["meta"];

  return {
    action: "list",
    success: true,
    items: applySearchFilter([...folders, ...files], search),
    nextContinuationToken: result.nextContinuationToken,
    nextCursor: result.nextContinuationToken,
    isTruncated: result.isTruncated,
    meta,
  };
}

async function handleDelete(
  s3: ReturnType<typeof getS3Client>,
  bucket: string,
  payload: BrowserActionPayload,
  rootPrefix?: string,
): Promise<BrowserActionResponse> {
  const key = enforceRootPrefix(requireKey(payload), rootPrefix);
  let deletedKeys: string[] = [key];

  if (key.endsWith("/")) {
    const keys = await listAllObjectKeysInPrefix(
      s3,
      bucket,
      normalizeFolderPrefix(key),
    );
    const targets = Array.from(new Set([normalizeFolderPrefix(key), ...keys]));
    await deleteObjects(s3, { bucket, keys: targets });
    deletedKeys = targets;
  } else {
    await deleteObject(s3, {
      bucket,
      key,
    });
  }
  return {
    action: "delete",
    success: true,
    deleted: deletedKeys,
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
  const targets = new Set<string>();

  for (const key of keys) {
    if (!key.endsWith("/")) {
      targets.add(key);
      continue;
    }

    const sourcePrefix = normalizeFolderPrefix(key);
    targets.add(sourcePrefix);
    const nestedKeys = await listAllObjectKeysInPrefix(
      s3,
      bucket,
      sourcePrefix,
    );
    for (const nestedKey of nestedKeys) {
      targets.add(nestedKey);
    }
  }

  const result = await deleteObjects(s3, {
    bucket,
    keys: Array.from(targets),
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
  const nextName = sanitizePathSegment(payload.newName, "newName");

  if (key.endsWith("/")) {
    const sourcePrefix = normalizeFolderPrefix(key);
    const withoutSlash = sourcePrefix.slice(0, -1);
    const slash = withoutSlash.lastIndexOf("/");
    const parentPrefix = slash >= 0 ? withoutSlash.slice(0, slash + 1) : "";
    const destinationPrefix = enforceRootPrefix(
      `${parentPrefix}${nextName}/`,
      rootPrefix,
    );
    const copiedKeys = await copyFolderPrefix(
      s3,
      bucket,
      sourcePrefix,
      destinationPrefix,
    );
    const deleteTargets = Array.from(new Set([sourcePrefix, ...copiedKeys]));
    await deleteObjects(s3, { bucket, keys: deleteTargets });
    return {
      action: "rename",
      success: true,
    };
  }

  const slash = key.lastIndexOf("/");
  const parentPrefix = slash >= 0 ? key.slice(0, slash + 1) : "";
  const destinationKey = enforceRootPrefix(
    `${parentPrefix}${nextName}`,
    rootPrefix,
  );

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
  const destination = enforceRootPrefix(
    requireDestination(payload),
    rootPrefix,
  );

  if (key.endsWith("/")) {
    const sourcePrefix = normalizeFolderPrefix(key);
    const destinationPrefix = destinationPrefixForFolder(
      sourcePrefix,
      destination,
    );
    const copiedKeys = await copyFolderPrefix(
      s3,
      bucket,
      sourcePrefix,
      destinationPrefix,
    );
    if (action === "move") {
      const deleteTargets = Array.from(new Set([sourcePrefix, ...copiedKeys]));
      await deleteObjects(s3, { bucket, keys: deleteTargets });
    }
    return {
      action,
      success: true,
    };
  }

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
  const folderName = sanitizePathSegment(payload.folderName, "folderName");
  const basePrefix = enforceRootPrefix(
    payload.prefix ?? rootPrefix ?? "",
    rootPrefix,
  );
  const normalizedBase =
    basePrefix === "" || basePrefix.endsWith("/")
      ? basePrefix
      : `${basePrefix}/`;
  const folderKey = enforceRootPrefix(
    `${normalizedBase}${folderName}/`,
    rootPrefix,
  );

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
  config: S3Config,
  bucket: string,
  payload: BrowserActionPayload,
  route: BrowserRouteConfig,
): Promise<BrowserActionResponse> {
  switch (payload.action) {
    case "list":
      return handleList(s3, config, bucket, payload, route);
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
      return handleGetUrl(
        "get-download-url",
        s3,
        bucket,
        payload,
        route.rootPrefix,
      );
    case "get-preview-url":
      return handleGetUrl(
        "get-preview-url",
        s3,
        bucket,
        payload,
        route.rootPrefix,
      );
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

    const bucket = resolveBucket(
      payload,
      handlerConfig.route,
      handlerConfig.config,
    );
    const s3 = getS3Client(handlerConfig.config);
    const response = await executeAction(
      s3,
      handlerConfig.config,
      bucket,
      payload,
      handlerConfig.route,
    );
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
