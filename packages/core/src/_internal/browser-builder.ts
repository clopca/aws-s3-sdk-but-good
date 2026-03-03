import type { BrowserAction } from "@s3-good-internal/shared";
import type {
  BrowserMiddlewareFn,
  BrowserPermissionFn,
  BrowserRouteConfig,
} from "./browser-types";

export class BrowserBuilder<TMetadata = unknown> {
  private readonly config: BrowserRouteConfig<TMetadata>;

  constructor(config: BrowserRouteConfig<TMetadata> = {}) {
    this.config = config;
  }

  middleware<TNewMetadata>(
    fn: BrowserMiddlewareFn<TNewMetadata>,
  ): BrowserBuilder<TNewMetadata> {
    return new BrowserBuilder<TNewMetadata>({
      ...((this.config as unknown) as BrowserRouteConfig<TNewMetadata>),
      middleware: fn,
    });
  }

  permissions(fn: BrowserPermissionFn<TMetadata>): BrowserBuilder<TMetadata> {
    return new BrowserBuilder<TMetadata>({
      ...this.config,
      permissions: fn,
    });
  }

  rootPrefix(prefix: string): BrowserBuilder<TMetadata> {
    const trimmed = prefix.trim();
    if (!trimmed) {
      return new BrowserBuilder<TMetadata>({
        ...this.config,
        rootPrefix: undefined,
      });
    }
    return new BrowserBuilder<TMetadata>({
      ...this.config,
      rootPrefix: trimmed.endsWith("/") ? trimmed : `${trimmed}/`,
    });
  }

  allowedActions(actions: BrowserAction[]): BrowserBuilder<TMetadata> {
    return new BrowserBuilder<TMetadata>({
      ...this.config,
      allowedActions: actions,
    });
  }

  buckets(list: string[], defaultBucket?: string): BrowserBuilder<TMetadata> {
    const buckets = list.map((bucket) => bucket.trim()).filter(Boolean);
    return new BrowserBuilder<TMetadata>({
      ...this.config,
      buckets,
      defaultBucket,
    });
  }

  pageSize(size: number): BrowserBuilder<TMetadata> {
    return new BrowserBuilder<TMetadata>({
      ...this.config,
      pageSize: size,
    });
  }

  _build(): BrowserRouteConfig<TMetadata> {
    return { ...this.config };
  }
}
