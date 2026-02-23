import { describe, it, expect, afterAll } from "vitest";
import {
  getTestConfig,
  getTestPrefix,
  createTestFile,
  cleanupPrefix,
  createTestRouter,
  createTestHandler,
  buildUploadRequest,
  buildMultipartCompleteRequest,
  assertObjectExists,
  type TestRouterCallbackData,
} from "./helpers";

describe("Multipart Upload (E2E)", () => {
  const config = getTestConfig();
  const prefix = getTestPrefix();
  const callbackResults: TestRouterCallbackData[] = [];
  const router = createTestRouter(prefix, callbackResults);
  const handler = createTestHandler(router, config);

  /** Convert a Buffer (or subarray) to a Blob for fetch() body compatibility */
  function bufferToBlob(buf: Buffer): Blob {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return new Blob([ab]);
  }

  afterAll(async () => {
    await cleanupPrefix(config, prefix);
  });

  it("test_multipart_upload_large_file", async () => {
    // Create a file > 50MB to trigger multipart upload
    // Using 51MB to be just above the MULTIPART_THRESHOLD (50MB)
    const fileSize = 51 * 1024 * 1024;
    const testFile = createTestFile(fileSize, "application/octet-stream");

    // 1. Send upload request — should return multipart upload info
    const req = buildUploadRequest("largeFileUploader", [
      { name: "large-file.bin", size: testFile.size, type: testFile.type },
    ]);
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);

    const fileInfo = data.files[0];
    expect(fileInfo).toHaveProperty("uploadId");
    expect(fileInfo).toHaveProperty("parts");
    expect(fileInfo).toHaveProperty("chunkSize");
    expect(fileInfo).toHaveProperty("chunkCount");
    expect(Array.isArray(fileInfo.parts)).toBe(true);
    expect(fileInfo.parts.length).toBeGreaterThan(1);

    // 2. Upload each part to its presigned URL
    const etags: Array<{ partNumber: number; etag: string }> = [];

    for (const part of fileInfo.parts) {
      const start = (part.partNumber - 1) * fileInfo.chunkSize;
      const end = Math.min(start + fileInfo.chunkSize, testFile.size);
      const chunk = testFile.buffer.subarray(start, end);
      const body = bufferToBlob(chunk);

      const uploadResponse = await fetch(part.url, {
        method: "PUT",
        body,
      });
      expect(uploadResponse.ok).toBe(true);

      // S3 returns ETag in the response headers
      const etag = uploadResponse.headers.get("etag");
      expect(etag).toBeTruthy();
      etags.push({ partNumber: part.partNumber, etag: etag! });
    }

    // 3. Send multipart-complete request
    const fileEtags: Record<
      string,
      Array<{ partNumber: number; etag: string }>
    > = {
      [fileInfo.key]: etags,
    };

    const completeReq = buildMultipartCompleteRequest(
      "largeFileUploader",
      [fileInfo.key],
      data.metadata,
      fileEtags,
    );
    const completeResponse = await handler(completeReq);
    expect(completeResponse.status).toBe(200);

    const completeData = await completeResponse.json();
    expect(completeData.files).toHaveLength(1);
    expect(completeData.files[0]).toHaveProperty("key", fileInfo.key);

    // 4. Verify file exists in S3
    await assertObjectExists(config, fileInfo.key);
  }, 120_000); // 2 minute timeout for large file upload

  it("test_multipart_complete_callback", async () => {
    // Verify onUploadComplete fires with correct metadata
    const callbacksBefore = callbackResults.length;

    const fileSize = 51 * 1024 * 1024;
    const testFile = createTestFile(fileSize, "application/octet-stream");

    // 1. Get presigned URLs
    const req = buildUploadRequest("largeFileUploader", [
      {
        name: "callback-test.bin",
        size: testFile.size,
        type: testFile.type,
      },
    ]);
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    const fileInfo = data.files[0];

    // 2. Upload all parts
    const etags: Array<{ partNumber: number; etag: string }> = [];
    for (const part of fileInfo.parts) {
      const start = (part.partNumber - 1) * fileInfo.chunkSize;
      const end = Math.min(start + fileInfo.chunkSize, testFile.size);
      const chunk = testFile.buffer.subarray(start, end);
      const body = bufferToBlob(chunk);

      const uploadResponse = await fetch(part.url, {
        method: "PUT",
        body,
      });
      expect(uploadResponse.ok).toBe(true);

      const etag = uploadResponse.headers.get("etag");
      expect(etag).toBeTruthy();
      etags.push({ partNumber: part.partNumber, etag: etag! });
    }

    // 3. Complete multipart upload
    const fileEtags: Record<
      string,
      Array<{ partNumber: number; etag: string }>
    > = {
      [fileInfo.key]: etags,
    };

    const completeReq = buildMultipartCompleteRequest(
      "largeFileUploader",
      [fileInfo.key],
      data.metadata,
      fileEtags,
    );
    const completeResponse = await handler(completeReq);
    expect(completeResponse.status).toBe(200);

    const completeData = await completeResponse.json();

    // 4. Verify callback was invoked
    expect(callbackResults.length).toBeGreaterThan(callbacksBefore);

    const lastCallback = callbackResults[callbackResults.length - 1]!;
    expect(lastCallback.file.key).toBe(fileInfo.key);
    expect(lastCallback.metadata).toHaveProperty("testPrefix", prefix);

    // 5. Verify serverData was returned
    expect(completeData.files[0].serverData).toHaveProperty(
      "uploadedBy",
      "e2e-test",
    );
    expect(completeData.files[0].serverData).toHaveProperty(
      "key",
      fileInfo.key,
    );
  }, 120_000); // 2 minute timeout for large file upload
});
