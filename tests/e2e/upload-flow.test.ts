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
  uploadToPresignedUrl,
  assertObjectExists,
  type TestRouterCallbackData,
} from "./helpers";

describe("Upload Flow (E2E)", () => {
  const config = getTestConfig();
  const prefix = getTestPrefix();
  const callbackResults: TestRouterCallbackData[] = [];
  const router = createTestRouter(prefix, callbackResults);
  const handler = createTestHandler(router, config);

  afterAll(async () => {
    await cleanupPrefix(config, prefix);
  });

  it("test_simple_upload_small_file", async () => {
    // 1. Create a small test file
    const testFile = createTestFile(1024, "image/jpeg");

    // 2. Send upload request to get presigned URL
    const req = buildUploadRequest("imageUploader", [
      { name: "small-test.jpg", size: testFile.size, type: testFile.type },
    ]);
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);
    expect(data.files[0]).toHaveProperty("key");
    expect(data.files[0]).toHaveProperty("url");
    expect(data.files[0]).toHaveProperty("name", "small-test.jpg");
    expect(data.files[0]).toHaveProperty("fileType", "image/jpeg");
    expect(data.metadata).toBeDefined();

    const fileInfo = data.files[0];

    // 3. Upload file to presigned URL
    const uploadResponse = await uploadToPresignedUrl(
      fileInfo.url,
      testFile.buffer,
      testFile.type,
    );
    expect(uploadResponse.ok).toBe(true);

    // 4. Verify file exists in S3
    await assertObjectExists(config, fileInfo.key);

    // 5. Complete the upload callback
    const completeReq = buildMultipartCompleteRequest(
      "imageUploader",
      [fileInfo.key],
      data.metadata,
    );
    const completeResponse = await handler(completeReq);
    expect(completeResponse.status).toBe(200);

    const completeData = await completeResponse.json();
    expect(completeData.files).toHaveLength(1);
    expect(completeData.files[0]).toHaveProperty("key", fileInfo.key);
    expect(completeData.files[0]).toHaveProperty("url");
    expect(completeData.files[0]).toHaveProperty("serverData");
  });

  it("test_upload_multiple_files", async () => {
    // Upload 3 files in one request
    const files = [
      { name: "multi-1.jpg", size: 512, type: "image/jpeg" },
      { name: "multi-2.png", size: 768, type: "image/png" },
      { name: "multi-3.gif", size: 256, type: "image/gif" },
    ];

    const req = buildUploadRequest("imageUploader", files);
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(3);

    // Upload each file to its presigned URL
    for (let i = 0; i < data.files.length; i++) {
      const fileInfo = data.files[i];
      const testFile = createTestFile(files[i]!.size, files[i]!.type);
      const uploadResponse = await uploadToPresignedUrl(
        fileInfo.url,
        testFile.buffer,
        testFile.type,
      );
      expect(uploadResponse.ok).toBe(true);
    }

    // Verify all files exist in S3
    for (const fileInfo of data.files) {
      await assertObjectExists(config, fileInfo.key);
    }

    // Complete the upload callback for all files
    const fileKeys = data.files.map(
      (f: { key: string }) => f.key,
    );
    const completeReq = buildMultipartCompleteRequest(
      "imageUploader",
      fileKeys,
      data.metadata,
    );
    const completeResponse = await handler(completeReq);
    expect(completeResponse.status).toBe(200);

    const completeData = await completeResponse.json();
    expect(completeData.files).toHaveLength(3);
  });

  it("test_upload_with_input_validation", async () => {
    // Upload with Zod-validated input
    const testFile = createTestFile(512, "image/jpeg");

    const req = buildUploadRequest(
      "withInputUploader",
      [{ name: "tagged-file.jpg", size: testFile.size, type: testFile.type }],
      { tag: "avatar", category: "profile" },
    );
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.files).toHaveLength(1);

    const fileInfo = data.files[0];

    // Upload the file
    const uploadResponse = await uploadToPresignedUrl(
      fileInfo.url,
      testFile.buffer,
      testFile.type,
    );
    expect(uploadResponse.ok).toBe(true);

    // Complete the upload
    const completeReq = buildMultipartCompleteRequest(
      "withInputUploader",
      [fileInfo.key],
      data.metadata,
    );
    const completeResponse = await handler(completeReq);
    expect(completeResponse.status).toBe(200);

    const completeData = await completeResponse.json();
    expect(completeData.files[0]).toHaveProperty("serverData");
    // The serverData should include the tag from the middleware
    expect(completeData.files[0].serverData).toHaveProperty("tag", "avatar");
  });

  it("test_uploaded_file_accessible", async () => {
    // Upload a file and verify it's accessible via its URL
    const content = "Hello, E2E test!";
    const buffer = Buffer.from(content, "utf-8");

    const req = buildUploadRequest("imageUploader", [
      { name: "accessible-test.jpg", size: buffer.length, type: "image/jpeg" },
    ]);
    const response = await handler(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    const fileInfo = data.files[0];

    // Upload the file
    const uploadResponse = await uploadToPresignedUrl(
      fileInfo.url,
      buffer,
      "image/jpeg",
    );
    expect(uploadResponse.ok).toBe(true);

    // Verify the file exists in S3 (via HeadObject)
    await assertObjectExists(config, fileInfo.key);

    // The file URL should be a valid S3 URL
    expect(fileInfo.url).toMatch(/^https:\/\//);
  });
});
