import { describe, it, expect } from "vitest";
import {
  getTestConfig,
  getTestPrefix,
  createTestRouter,
  createTestHandler,
  buildUploadRequest,
  buildMultipartCompleteRequest,
} from "./helpers";
import { encodeMetadataToken } from "../../packages/core/src/_internal/handler";

describe("Error Scenarios (E2E)", () => {
  const config = getTestConfig();
  const prefix = getTestPrefix();
  const router = createTestRouter(prefix);
  const handler = createTestHandler(router, config);

  it("test_upload_exceeds_size_limit", async () => {
    // strictImageUploader has maxFileSize: "1MB"
    // Send a file that claims to be 2MB
    const req = buildUploadRequest("strictImageUploader", [
      { name: "too-large.jpg", size: 2 * 1024 * 1024, type: "image/jpeg" },
    ]);

    const response = await handler(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("FILE_TOO_LARGE");
  });

  it("test_upload_wrong_file_type", async () => {
    // imageUploader only accepts image/* types
    // Send a PDF file
    const req = buildUploadRequest("imageUploader", [
      { name: "document.pdf", size: 1024, type: "application/pdf" },
    ]);

    const response = await handler(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("INVALID_FILE_TYPE");
  });

  it("test_upload_missing_slug", async () => {
    // POST without slug parameter
    const req = new Request(
      "http://localhost/api/upload?actionType=upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "test.jpg", size: 1024, type: "image/jpeg" }],
        }),
      },
    );

    const response = await handler(req);
    // Should return an error for missing slug
    expect(response.status).toBeGreaterThanOrEqual(400);

    const data = await response.json();
    expect(data.error).toBe("ROUTE_NOT_FOUND");
  });

  it("test_upload_nonexistent_route", async () => {
    // POST with a slug that doesn't exist in the router
    const req = buildUploadRequest("nonExistentRoute", [
      { name: "test.jpg", size: 1024, type: "image/jpeg" },
    ]);

    const response = await handler(req);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("ROUTE_NOT_FOUND");
  });

  it("test_upload_too_many_files", async () => {
    // strictImageUploader has maxFileCount: 1
    // Send 2 files
    const req = buildUploadRequest("strictImageUploader", [
      { name: "file1.jpg", size: 512, type: "image/jpeg" },
      { name: "file2.jpg", size: 512, type: "image/jpeg" },
    ]);

    const response = await handler(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("TOO_MANY_FILES");
  });

  it("test_upload_invalid_input", async () => {
    // withInputUploader expects { tag: string, category: string }
    // Send invalid input (missing category)
    const req = buildUploadRequest(
      "withInputUploader",
      [{ name: "test.jpg", size: 512, type: "image/jpeg" }],
      { tag: "avatar" }, // missing 'category'
    );

    const response = await handler(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("INPUT_VALIDATION_FAILED");
  });

  it("test_expired_metadata_token", async () => {
    // Create a metadata token that is already expired
    const expiredToken = encodeMetadataToken(
      {
        fileKeys: ["fake-key.jpg"],
        fileNames: { "fake-key.jpg": "test.jpg" },
        fileSizes: { "fake-key.jpg": 1024 },
        fileTypes: { "fake-key.jpg": "image/jpeg" },
        metadata: {},
        routeSlug: "imageUploader",
        expiresAt: Date.now() - 1000, // Already expired
      },
      config.secretAccessKey,
    );

    const req = buildMultipartCompleteRequest(
      "imageUploader",
      ["fake-key.jpg"],
      expiredToken,
    );

    const response = await handler(req);
    expect(response.status).toBeGreaterThanOrEqual(400);

    const data = await response.json();
    expect(data.error).toBe("UPLOAD_EXPIRED");
  });

  it("test_missing_action_type", async () => {
    // POST without actionType parameter
    const req = new Request(
      "http://localhost/api/upload?slug=imageUploader",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{ name: "test.jpg", size: 1024, type: "image/jpeg" }],
        }),
      },
    );

    const response = await handler(req);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("INTERNAL_ERROR");
  });
});
