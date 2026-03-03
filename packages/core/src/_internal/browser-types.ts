import type {
  BrowserAction,
  BrowserActionPayload,
  S3Config,
} from "@s3-good-internal/shared";
import type { MaybePromise } from "./types";

export type BrowserMiddlewareFn<TMetadata = unknown> = (opts: {
  req: Request;
  action: BrowserAction;
  payload: BrowserActionPayload;
}) => MaybePromise<TMetadata>;

export type BrowserPermissionFn<TMetadata = unknown> = (opts: {
  action: BrowserAction;
  payload: BrowserActionPayload;
  metadata: TMetadata;
}) => MaybePromise<boolean>;

export interface BrowserRouteConfig<TMetadata = unknown> {
  middleware?: BrowserMiddlewareFn<TMetadata>;
  permissions?: BrowserPermissionFn<TMetadata>;
  rootPrefix?: string;
  allowedActions?: BrowserAction[];
  buckets?: string[];
  defaultBucket?: string;
  pageSize?: number;
}

export interface BrowserHandlerConfig {
  route: BrowserRouteConfig;
  config: S3Config;
}
