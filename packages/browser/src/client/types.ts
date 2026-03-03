import type { BrowserListFilters, BrowserItem } from "s3-good/types";

export interface BrowserClientOptions {
  url?: string;
  headers?: HeadersInit | (() => Promise<HeadersInit> | HeadersInit);
}

export interface ListResult {
  items: BrowserItem[];
  hasMore: boolean;
  nextCursor?: string;
  continuationToken?: string;
  meta?: {
    mode: "s3-list";
    bucket: string;
    buckets?: string[];
    defaultBucket?: string;
  };
}

export interface ListParams {
  bucket?: string;
  prefix?: string;
  filters?: BrowserListFilters;
  continuationToken?: string;
  cursor?: string;
  signal?: AbortSignal;
}

export interface DeleteResult {
  deleted: string[];
}

export interface BrowserClientError extends Error {
  status: number;
  action: string;
}
