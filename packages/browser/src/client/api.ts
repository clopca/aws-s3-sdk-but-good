import type {
  BrowserActionPayload,
  BrowserActionResponse,
  BrowserFile,
  BrowserItem,
  BrowserListFilters,
} from "@s3-good/shared";
import type {
  BrowserClientError,
  BrowserClientOptions,
  DeleteResult,
  ListParams,
  ListResult,
} from "./types";

function toObjectHeaders(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

type BrowserWireFile = Omit<BrowserFile, "lastModified"> & {
  lastModified: string | Date;
};

type BrowserWireItem = BrowserWireFile | BrowserItem;

function deserializeItems(items: BrowserWireItem[] = []): BrowserItem[] {
  return items.map((item) => {
    if (item.kind !== "file") return item;

    return {
      ...item,
      lastModified:
        item.lastModified instanceof Date
          ? item.lastModified
          : new Date(item.lastModified),
    } as BrowserFile;
  });
}

function createClientError(
  message: string,
  status: number,
  action: string,
): BrowserClientError {
  const error = new Error(message) as BrowserClientError;
  error.name = "BrowserClientError";
  error.status = status;
  error.action = action;
  return error;
}

export function createBrowserClient(opts: BrowserClientOptions = {}) {
  const baseUrl = opts.url ?? "/api/browser";
  const withBucket = (bucket?: string): { bucket?: string } => (bucket ? { bucket } : {});

  async function getHeaders(): Promise<Record<string, string>> {
    const baseHeaders = { "Content-Type": "application/json" };

    if (!opts.headers) return baseHeaders;

    const customHeaders = typeof opts.headers === "function"
      ? await opts.headers()
      : opts.headers;

    return {
      ...baseHeaders,
      ...toObjectHeaders(customHeaders),
    };
  }

  async function parseResponse(
    response: Response,
    action: string,
  ): Promise<BrowserActionResponse> {
    const body = (await response.json().catch(() => ({}))) as Partial<BrowserActionResponse>;

    if (!response.ok || body.success === false) {
      throw createClientError(
        body.error ?? "Request failed",
        response.status,
        action,
      );
    }

    return body as BrowserActionResponse;
  }

  async function fetchPost(payload: BrowserActionPayload): Promise<BrowserActionResponse> {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });

    return parseResponse(response, payload.action);
  }

  async function list(params: ListParams = {}): Promise<ListResult> {
    const filters: BrowserListFilters = {
      ...(params.filters ?? {}),
      prefix: params.filters?.prefix ?? params.prefix,
    };

    const response = await fetchPost({
      action: "list",
      bucket: params.bucket,
      prefix: params.prefix,
      continuationToken: params.continuationToken,
      cursor: params.cursor,
      filters,
    });

    return {
      items: deserializeItems(response.items),
      hasMore: response.isTruncated ?? false,
      continuationToken: response.nextContinuationToken,
      nextCursor: response.nextCursor,
      meta: response.meta,
    };
  }

  async function deleteFile(key: string, bucket?: string): Promise<void> {
    await fetchPost({ action: "delete", key, ...withBucket(bucket) });
  }

  async function deleteMany(keys: string[], bucket?: string): Promise<DeleteResult> {
    const response = await fetchPost({ action: "delete-many", keys, ...withBucket(bucket) });
    return { deleted: response.deleted ?? [] };
  }

  async function rename(key: string, newName: string, bucket?: string): Promise<void> {
    await fetchPost({ action: "rename", key, newName, ...withBucket(bucket) });
  }

  async function move(key: string, destination: string, bucket?: string): Promise<void> {
    await fetchPost({ action: "move", key, destination, ...withBucket(bucket) });
  }

  async function copy(key: string, destination: string, bucket?: string): Promise<void> {
    await fetchPost({ action: "copy", key, destination, ...withBucket(bucket) });
  }

  async function createFolder(prefix: string, folderName: string, bucket?: string): Promise<void> {
    await fetchPost({ action: "create-folder", prefix, folderName, ...withBucket(bucket) });
  }

  async function getDownloadUrl(key: string, bucket?: string): Promise<string> {
    const response = await fetchPost({ action: "get-download-url", key, ...withBucket(bucket) });
    return response.url ?? "";
  }

  async function getPreviewUrl(key: string, bucket?: string): Promise<string> {
    const response = await fetchPost({ action: "get-preview-url", key, ...withBucket(bucket) });
    return response.url ?? "";
  }

  return {
    list,
    deleteFile,
    deleteMany,
    rename,
    move,
    copy,
    createFolder,
    getDownloadUrl,
    getPreviewUrl,
  };
}

export type BrowserClient = ReturnType<typeof createBrowserClient>;
