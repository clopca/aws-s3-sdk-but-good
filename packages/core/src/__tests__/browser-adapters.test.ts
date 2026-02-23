import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_internal/browser-handler", () => ({
  handleBrowserAction: vi.fn().mockResolvedValue(Response.json({ success: true, action: "list" })),
}));

import { handleBrowserAction } from "../_internal/browser-handler";
import { createBrowser } from "../server";
import { createBrowserRouteHandler as createNextBrowserRouteHandler } from "../next";
import { createBrowserRouteHandler as createHonoBrowserRouteHandler } from "../hono";

describe("browser adapters", () => {
  const config = {
    region: "us-east-1",
    bucket: "bucket",
    accessKeyId: "AKIA...",
    secretAccessKey: "secret",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test_next_createBrowserRouteHandler_returns_handlers", () => {
    const handlers = createNextBrowserRouteHandler({
      browser: createBrowser(),
      config,
    });

    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
  });

  it("test_next_handlers_delegate_to_handleBrowserAction", async () => {
    const handlers = createNextBrowserRouteHandler({ browser: createBrowser(), config });

    const req = new Request("http://localhost/api/browser?action=list");
    await handlers.GET(req);
    await handlers.POST(req);

    expect(handleBrowserAction).toHaveBeenNthCalledWith(1, req, expect.any(Object));
    expect(handleBrowserAction).toHaveBeenNthCalledWith(2, req, expect.any(Object));
  });

  it("test_hono_createBrowserRouteHandler_returns_handlers", () => {
    const handlers = createHonoBrowserRouteHandler({
      browser: createBrowser(),
      config,
    });

    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
  });

  it("test_hono_handlers_use_c_req_raw", async () => {
    const handlers = createHonoBrowserRouteHandler({ browser: createBrowser(), config });

    const req = new Request("http://localhost/api/browser?action=list");
    const context = { req: { raw: req } };

    await handlers.GET(context as never);
    await handlers.POST(context as never);

    expect(handleBrowserAction).toHaveBeenNthCalledWith(1, req, expect.any(Object));
    expect(handleBrowserAction).toHaveBeenNthCalledWith(2, req, expect.any(Object));
  });
});
