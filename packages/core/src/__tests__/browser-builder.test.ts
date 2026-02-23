import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_internal/browser-handler", () => ({
  handleBrowserAction: vi.fn().mockResolvedValue(Response.json({ success: true, action: "list" })),
}));

import { handleBrowserAction } from "../_internal/browser-handler";
import { createBrowser, createBrowserRouteHandler } from "../server";

describe("browser builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_createBrowser_returns_builder", () => {
    const builder = createBrowser();
    expect(builder).toBeDefined();
    expect(typeof builder._build).toBe("function");
  });

  it("test_builder_chain_methods", () => {
    const middleware = vi.fn(async () => ({ userId: "u1" }));
    const permissions = vi.fn(async () => true);

    const builder = createBrowser()
      .middleware(middleware)
      .permissions(permissions)
      .rootPrefix("uploads")
      .allowedActions(["list"])
      .buckets(["bucket-a", "bucket-b"], "bucket-b")
      .pageSize(50);

    const built = builder._build();
    expect(built.rootPrefix).toBe("uploads/");
    expect(built.pageSize).toBe(50);
    expect(built.allowedActions).toEqual(["list"]);
    expect(built.buckets).toEqual(["bucket-a", "bucket-b"]);
    expect(built.defaultBucket).toBe("bucket-b");
    expect(built.middleware).toBe(middleware);
    expect(built.permissions).toBe(permissions);
  });

  it("test_builder_rootPrefix_no_double_slash", () => {
    const built = createBrowser().rootPrefix("uploads/")._build();
    expect(built.rootPrefix).toBe("uploads/");
  });

  it("test_createBrowserRouteHandler_returns_handlers", async () => {
    const handlers = createBrowserRouteHandler({
      browser: createBrowser().rootPrefix("uploads"),
      config: {
        region: "us-east-1",
        bucket: "bucket",
        accessKeyId: "AKIA...",
        secretAccessKey: "secret",
      },
    });

    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");

    await handlers.GET(new Request("http://localhost/api/browser?action=list"));
    expect(handleBrowserAction).toHaveBeenCalledOnce();
  });
});
