import { describe, it, expect } from "vitest";
import { z } from "zod";
import { UploadError } from "@s3-good-internal/shared";
import type { FileRouter, FileRoute, AnyParams } from "../_internal/types";
import {
  getRouteFromSlug,
  parseUploadRequest,
  validateAndParseInput,
  runMiddleware,
} from "../_internal/handler";

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
    _input: undefined as any,
    _metadata: undefined as any,
    _output: undefined as any,
  };
}

function makeRouter(routes: Record<string, FileRoute<AnyParams>>): FileRouter {
  return routes;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("getRouteFromSlug", () => {
  const imageRoute = makeRoute();
  const pdfRoute = makeRoute({ routerConfig: { pdf: {} } });
  const router = makeRouter({ imageUploader: imageRoute, pdfUploader: pdfRoute });

  it("test_getRouteFromSlug_found", () => {
    const result = getRouteFromSlug(router, "imageUploader");
    expect(result).toBe(imageRoute);
  });

  it("test_getRouteFromSlug_not_found", () => {
    const result = getRouteFromSlug(router, "nonExistent");
    expect(result).toBeNull();
  });
});

describe("parseUploadRequest", () => {
  it("test_parseUploadRequest_valid", async () => {
    const body = { files: [{ name: "test.jpg", size: 1024, type: "image/jpeg" }] };
    const req = new Request(
      "http://localhost/api/upload?slug=imageUploader&actionType=upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const result = await parseUploadRequest(req);
    expect(result.slug).toBe("imageUploader");
    expect(result.actionType).toBe("upload");
    expect(result.body).toEqual(body);
  });

  it("test_parseUploadRequest_missing_slug", async () => {
    const req = new Request(
      "http://localhost/api/upload?actionType=upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    await expect(parseUploadRequest(req)).rejects.toThrow(UploadError);
    await expect(
      parseUploadRequest(
        new Request("http://localhost/api/upload?actionType=upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      ),
    ).rejects.toMatchObject({ code: "ROUTE_NOT_FOUND" });
  });
});

describe("validateAndParseInput", () => {
  it("test_validateAndParseInput_valid", async () => {
    const schema = z.object({ tag: z.string() });
    const route = makeRoute({ inputParser: schema });

    const result = await validateAndParseInput(route, { tag: "avatar" });
    expect(result).toEqual({ tag: "avatar" });
  });

  it("test_validateAndParseInput_invalid", async () => {
    const schema = z.object({ tag: z.string() });
    const route = makeRoute({ inputParser: schema });

    await expect(validateAndParseInput(route, { tag: 123 })).rejects.toThrow(
      UploadError,
    );
    await expect(
      validateAndParseInput(
        makeRoute({ inputParser: z.object({ tag: z.string() }) }),
        { tag: 123 },
      ),
    ).rejects.toMatchObject({ code: "INPUT_VALIDATION_FAILED" });
  });

  it("test_validateAndParseInput_no_schema", async () => {
    const route = makeRoute({ inputParser: undefined });

    const result = await validateAndParseInput(route, undefined);
    expect(result).toBeUndefined();
  });
});

describe("runMiddleware", () => {
  it("test_runMiddleware_success", async () => {
    const route = makeRoute({
      middleware: () => ({ userId: "user_456", role: "admin" }),
    });
    const req = new Request("http://localhost/api/upload");

    const result = await runMiddleware(route, req, undefined);
    expect(result).toEqual({ userId: "user_456", role: "admin" });
  });

  it("test_runMiddleware_throws_UploadError", async () => {
    const originalError = new UploadError({
      code: "MIDDLEWARE_ERROR",
      message: "Unauthorized",
      status: 403,
    });
    const route = makeRoute({
      middleware: () => {
        throw originalError;
      },
    });
    const req = new Request("http://localhost/api/upload");

    await expect(runMiddleware(route, req, undefined)).rejects.toBe(
      originalError,
    );
  });

  it("test_runMiddleware_throws_generic_error", async () => {
    const route = makeRoute({
      middleware: () => {
        throw new Error("Something went wrong");
      },
    });
    const req = new Request("http://localhost/api/upload");

    await expect(runMiddleware(route, req, undefined)).rejects.toThrow(
      UploadError,
    );
    await expect(
      runMiddleware(
        makeRoute({
          middleware: () => {
            throw new Error("Something went wrong");
          },
        }),
        new Request("http://localhost/api/upload"),
        undefined,
      ),
    ).rejects.toMatchObject({
      code: "MIDDLEWARE_ERROR",
      message: "Something went wrong",
    });
  });
});
