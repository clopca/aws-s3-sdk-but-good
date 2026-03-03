import type { S3Config } from "s3-good/types";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createUploader, createRouteHandler } from "s3-good/server";
import type { FileRouter } from "s3-good/server";
import { z } from "zod";

/** Generate a unique test prefix for object isolation */
export function getTestPrefix(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `e2e-test-${timestamp}-${random}/`;
}

/** Create a test file buffer of specified size */
export function createTestFile(
  sizeBytes: number,
  type = "application/octet-stream",
): {
  buffer: Buffer;
  name: string;
  size: number;
  type: string;
} {
  const buffer = Buffer.alloc(sizeBytes, "x");
  return {
    buffer,
    name: `test-file-${sizeBytes}.bin`,
    size: sizeBytes,
    type,
  };
}

/** Create a test S3Config from environment variables */
export function getTestConfig(): S3Config {
  return {
    region: process.env.S3_TEST_REGION!,
    bucket: process.env.S3_TEST_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };
}

/** Clean up all objects under a prefix */
export async function cleanupPrefix(
  config: S3Config,
  prefix: string,
): Promise<void> {
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const listResult = await client.send(
    new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix }),
  );

  const objects = listResult.Contents;
  if (!objects || objects.length === 0) return;

  await client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
    }),
  );
}

/** Assert an object exists in S3 */
export async function assertObjectExists(
  config: S3Config,
  key: string,
): Promise<void> {
  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  // HeadObject will throw if the object does not exist
  await client.send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

// ─── Test Router Factory ────────────────────────────────────────────────────

export interface TestRouterCallbackData {
  metadata: unknown;
  file: { key: string; url: string; name: string; size: number; type: string };
}

/**
 * Creates a real FileRouter for E2E testing.
 *
 * The `onUploadComplete` callback stores results in the provided array
 * so tests can assert on callback invocations.
 */
export function createTestRouter(
  prefix: string,
  callbackResults: TestRouterCallbackData[] = [],
): FileRouter {
  const f = createUploader();

  return {
    imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
      .middleware(() => ({ testPrefix: prefix }))
      .onUploadComplete(({ metadata, file }: { metadata: unknown; file: { key: string; url: string; name: string; size: number; type: string } }) => {
        callbackResults.push({ metadata, file });
        return { uploadedBy: "e2e-test", key: file.key };
      }),

    largeFileUploader: f({
      blob: { maxFileSize: "512MB", maxFileCount: 1 },
    })
      .middleware(() => ({ testPrefix: prefix }))
      .onUploadComplete(({ metadata, file }: { metadata: unknown; file: { key: string; url: string; name: string; size: number; type: string } }) => {
        callbackResults.push({ metadata, file });
        return { uploadedBy: "e2e-test", key: file.key };
      }),

    strictImageUploader: f({
      image: { maxFileSize: "1MB", maxFileCount: 1 },
    })
      .middleware(() => ({ testPrefix: prefix }))
      .onUploadComplete(({ metadata, file }: { metadata: unknown; file: { key: string; url: string; name: string; size: number; type: string } }) => {
        callbackResults.push({ metadata, file });
        return { uploadedBy: "e2e-test", key: file.key };
      }),

    withInputUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
      .input(z.object({ tag: z.string(), category: z.string() }))
      .middleware(({ input }: { input: { tag: string; category: string } }) => ({
        testPrefix: prefix,
        tag: input.tag,
        category: input.category,
      }))
      .onUploadComplete(({ metadata, file }: { metadata: unknown; file: { key: string; url: string; name: string; size: number; type: string } }) => {
        callbackResults.push({ metadata, file });
        return {
          uploadedBy: "e2e-test",
          key: file.key,
          tag: (metadata as { tag: string }).tag,
        };
      }),
  };
}

// ─── Route Handler Factory ──────────────────────────────────────────────────

/**
 * Creates a route handler (POST) for the given router and config.
 * Returns a function that accepts a Request and returns a Response.
 */
export function createTestHandler(
  router: FileRouter,
  config: S3Config,
): (req: Request) => Promise<Response> {
  const { POST } = createRouteHandler({ router, config });
  return POST;
}

// ─── Presigned URL Upload Helper ────────────────────────────────────────────

/**
 * Uploads a buffer to a presigned S3 URL.
 * Returns the fetch Response so callers can inspect status and headers.
 */
export async function uploadToPresignedUrl(
  url: string,
  buffer: Buffer,
  contentType: string,
): Promise<Response> {
  // Convert Buffer → ArrayBuffer → Blob for fetch() body compatibility
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: contentType });
  return fetch(url, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });
}

// ─── Request Builder ────────────────────────────────────────────────────────

const BASE_URL = "http://localhost/api/upload";

/**
 * Builds a POST Request for the upload handler.
 */
export function buildUploadRequest(
  slug: string,
  files: Array<{ name: string; size: number; type: string }>,
  input?: unknown,
): Request {
  return new Request(
    `${BASE_URL}?slug=${slug}&actionType=upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, input }),
    },
  );
}

/**
 * Builds a POST Request for the multipart-complete action.
 */
export function buildMultipartCompleteRequest(
  slug: string,
  fileKeys: string[],
  metadataToken: string,
  fileEtags?: Record<string, Array<{ partNumber: number; etag: string }>>,
): Request {
  return new Request(
    `${BASE_URL}?slug=${slug}&actionType=multipart-complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKeys, metadata: metadataToken, fileEtags }),
    },
  );
}
