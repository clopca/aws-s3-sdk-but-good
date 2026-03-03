import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FileRouter, FileRoute, AnyParams } from "../_internal/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoute(overrides?: Partial<FileRoute<AnyParams>["_def"]>): FileRoute<AnyParams> {
  return {
    _def: {
      routerConfig: { image: { maxFileSize: "4MB" } },
      inputParser: undefined,
      middleware: () => ({ userId: "user_123" }),
      onUploadComplete: () => undefined,
      ...overrides,
    },
    _input: undefined as never,
    _metadata: undefined as never,
    _output: undefined as never,
  };
}

function makeRouter(routes: Record<string, FileRoute<AnyParams>>): FileRouter {
  return routes;
}

const mockConfig = {
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
};

// ─── Mock handleUploadAction ────────────────────────────────────────────────

// We mock the handler module so POST doesn't actually process S3 operations.
vi.mock("../_internal/handler", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- typeof import() is the only way to type importOriginal
  const actual = await importOriginal<typeof import("../_internal/handler")>();
  return {
    ...actual,
    handleUploadAction: vi.fn().mockResolvedValue(
      Response.json({ files: [{ key: "test-key", url: "https://s3.example.com/test-key" }], metadata: "mock-token" }),
    ),
  };
});

// We need to suppress the server environment check since tests run in Node (no `window`)
// but the function checks typeof window !== "undefined". In Node, window IS undefined,
// so the check passes naturally. No mock needed.

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("createRouteHandler", () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- typeof import() is the only way to type the variable
  let createRouteHandler: typeof import("../next").createRouteHandler;

  beforeEach(async () => {
    vi.resetModules();
    // Re-mock after resetModules
    vi.doMock("../_internal/handler", async (importOriginal) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- typeof import() is the only way to type importOriginal
      const actual = await importOriginal<typeof import("../_internal/handler")>();
      return {
        ...actual,
        handleUploadAction: vi.fn().mockResolvedValue(
          Response.json({ files: [{ key: "test-key", url: "https://s3.example.com/test-key" }], metadata: "mock-token" }),
        ),
      };
    });
    // Dynamic import to get fresh module with mocks
    const mod = await import("../next");
    createRouteHandler = mod.createRouteHandler;
  });

  it("test_createRouteHandler_returns_GET_POST", () => {
    // Arrange
    const router = makeRouter({ imageUploader: makeRoute() });

    // Act
    const handlers = createRouteHandler({ router, config: mockConfig });

    // Assert
    expect(handlers).toHaveProperty("GET");
    expect(handlers).toHaveProperty("POST");
    expect(typeof handlers.GET).toBe("function");
    expect(typeof handlers.POST).toBe("function");
  });

  it("test_GET_returns_all_routes", async () => {
    // Arrange
    const imageRoute = makeRoute({ routerConfig: { image: { maxFileSize: "4MB" } } });
    const pdfRoute = makeRoute({ routerConfig: { pdf: { maxFileSize: "16MB" } } });
    const router = makeRouter({ imageUploader: imageRoute, pdfUploader: pdfRoute });
    const { GET } = createRouteHandler({ router, config: mockConfig });

    // Act
    const req = new Request("http://localhost/api/upload");
    const response = await GET(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toHaveProperty("imageUploader");
    expect(body).toHaveProperty("pdfUploader");
    expect(body.imageUploader.config).toEqual({ image: { maxFileSize: "4MB" } });
    expect(body.pdfUploader.config).toEqual({ pdf: { maxFileSize: "16MB" } });
  });

  it("test_GET_returns_specific_route", async () => {
    // Arrange
    const imageRoute = makeRoute({ routerConfig: { image: { maxFileSize: "4MB" } } });
    const router = makeRouter({ imageUploader: imageRoute });
    const { GET } = createRouteHandler({ router, config: mockConfig });

    // Act
    const req = new Request("http://localhost/api/upload?slug=imageUploader");
    const response = await GET(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual({ config: { image: { maxFileSize: "4MB" } } });
  });

  it("test_GET_returns_404_for_unknown", async () => {
    // Arrange
    const router = makeRouter({ imageUploader: makeRoute() });
    const { GET } = createRouteHandler({ router, config: mockConfig });

    // Act
    const req = new Request("http://localhost/api/upload?slug=nonExistent");
    const response = await GET(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(body.error.message).toContain("nonExistent");
  });

  it("test_POST_delegates_to_handler", async () => {
    // Arrange
    const router = makeRouter({ imageUploader: makeRoute() });
    const { POST } = createRouteHandler({ router, config: mockConfig });
    const { handleUploadAction } = await import("../_internal/handler");

    // Act
    const req = new Request(
      "http://localhost/api/upload?slug=imageUploader&actionType=upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "test.jpg", size: 1024, type: "image/jpeg" }],
        }),
      },
    );
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(handleUploadAction).toHaveBeenCalled();
    expect(body).toHaveProperty("files");
    expect(body.files[0].key).toBe("test-key");
  });

  it("test_POST_error_handling", async () => {
    // Arrange — mock handleUploadAction to throw
    const { UploadError } = await import("@s3-good-internal/shared");
    const { handleUploadAction } = await import("../_internal/handler");
    vi.mocked(handleUploadAction).mockRejectedValueOnce(
      new UploadError({ code: "ROUTE_NOT_FOUND", message: "Route not found" }),
    );

    const router = makeRouter({ imageUploader: makeRoute() });
    const { POST } = createRouteHandler({ router, config: mockConfig });

    // Act
    const req = new Request(
      "http://localhost/api/upload?slug=badRoute&actionType=upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [] }),
      },
    );
    const response = await POST(req);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
