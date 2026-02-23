import { createHmac } from "node:crypto";
import type { S3Config, UploadErrorCode } from "@s3-good/shared";
import { UploadError } from "@s3-good/shared";
import type { FileRouter, FileRoute, AnyParams } from "./types";
import { validateFilesForRoute } from "./file-types";
import { generateFileKeys } from "./file-key";
import {
  getS3Client,
  getContentDisposition,
  generatePresignedPutUrl,
  calculateParts,
  createMultipartUpload,
  generatePresignedPartUrls,
} from "./s3";
import { handleUploadCallback } from "./callback";

// ─── Handler Types ──────────────────────────────────────────────────────────

export interface RouteHandlerConfig {
  router: FileRouter;
  config: S3Config;
}

export interface UploadActionPayload {
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  input?: unknown;
}

export interface UploadActionResponse {
  files: Array<{
    key: string;
    url: string;
    name: string;
    fileType: string;
    /** Present for multipart uploads */
    uploadId?: string;
    /** Presigned URLs for each part (multipart only) */
    parts?: Array<{ partNumber: number; url: string }>;
    /** Size of each chunk in bytes (multipart only) */
    chunkSize?: number;
    /** Total number of chunks (multipart only) */
    chunkCount?: number;
  }>;
  /** Encoded metadata token passed back to the client */
  metadata: string;
}

// ─── Route Matching ─────────────────────────────────────────────────────────

/**
 * Look up a route by its slug (endpoint name) in the FileRouter.
 * Returns `null` if no route matches.
 */
export function getRouteFromSlug(
  router: FileRouter,
  slug: string,
): FileRoute<AnyParams> | null {
  return router[slug] ?? null;
}

// ─── Request Parsing ────────────────────────────────────────────────────────

export type ActionType = "upload" | "multipart-complete";

/**
 * Parse an incoming upload request, extracting the slug, action type, and body.
 * Uses standard Web API `Request` — framework-agnostic.
 */
export async function parseUploadRequest(req: Request): Promise<{
  slug: string;
  actionType: ActionType;
  body: unknown;
}> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const actionType = url.searchParams.get("actionType") as ActionType | null;

  if (!slug) {
    throw new UploadError({
      code: "ROUTE_NOT_FOUND",
      message: "Missing slug parameter",
    });
  }

  if (!actionType) {
    throw new UploadError({
      code: "INTERNAL_ERROR",
      message: "Missing actionType parameter",
    });
  }

  if (actionType !== "upload" && actionType !== "multipart-complete") {
    throw new UploadError({
      code: "INTERNAL_ERROR",
      message: `Invalid actionType: "${actionType}"`,
    });
  }

  const body: unknown = await req.json();
  return { slug, actionType, body };
}

// ─── Input Validation ───────────────────────────────────────────────────────

/**
 * Validate and parse the client-provided input against the route's Zod schema.
 * Returns `undefined` if the route has no input parser.
 * Throws `UploadError` with code `INPUT_VALIDATION_FAILED` on invalid input.
 */
export async function validateAndParseInput(
  route: FileRoute<AnyParams>,
  rawInput: unknown,
): Promise<unknown> {
  if (!route._def.inputParser) {
    return undefined;
  }

  const result = route._def.inputParser.safeParse(rawInput);

  if (!result.success) {
    throw new UploadError({
      code: "INPUT_VALIDATION_FAILED",
      message: `Input validation failed: ${result.error.message}`,
      status: 400,
    });
  }

  return result.data;
}

// ─── Middleware Execution ───────────────────────────────────────────────────

/**
 * Execute the route's middleware function.
 * Re-throws `UploadError` as-is; wraps other errors in a
 * `MIDDLEWARE_ERROR` with status 403.
 */
export async function runMiddleware(
  route: FileRoute<AnyParams>,
  req: Request,
  input: unknown,
): Promise<unknown> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata: unknown = await route._def.middleware({ req, input: input as any });
    return metadata;
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError({
      code: "MIDDLEWARE_ERROR",
      message: error instanceof Error ? error.message : "Middleware error",
      status: 403,
    });
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

/**
 * Handle an incoming upload action request.
 *
 * This is the core server-side entry point that:
 * 1. Parses the request (slug, actionType, body)
 * 2. Matches the slug to a FileRouter route
 * 3. Delegates to the appropriate action handler (upload or multipart-complete)
 */
export async function handleUploadAction(
  req: Request,
  routerConfig: RouteHandlerConfig,
): Promise<Response> {
  try {
    const { slug, actionType, body } = await parseUploadRequest(req);

    const route = getRouteFromSlug(routerConfig.router, slug);
    if (!route) {
      throw new UploadError({
        code: "ROUTE_NOT_FOUND",
        message: `Route "${slug}" not found`,
        status: 404,
      });
    }

    if (actionType === "upload") {
      return await handleUploadRequest(req, route, body, routerConfig.config, slug);
    } else if (actionType === "multipart-complete") {
      return await handleMultipartComplete(req, route, body, routerConfig.config);
    }

    throw new UploadError({
      code: "INTERNAL_ERROR",
      message: "Invalid actionType",
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return new Response(
        JSON.stringify({ error: error.code, message: error.message }),
        { status: error.status, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ─── Metadata Token ─────────────────────────────────────────────────────────

export interface UploadMetadata {
  fileKeys: string[];
  fileNames: Record<string, string>;
  fileSizes: Record<string, number>;
  fileTypes: Record<string, string>;
  metadata: unknown;
  routeSlug: string;
  uploadIds?: Record<string, string>;
  expiresAt: number;
}

/**
 * Encode upload metadata into a signed, stateless token using HMAC-SHA256.
 * The token is `base64url(payload).base64url(signature)`.
 */
export function encodeMetadataToken(data: UploadMetadata, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/**
 * Decode and verify a metadata token. Throws on invalid signature or expiry.
 */
export function decodeMetadataToken(token: string, secret: string): UploadMetadata {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new UploadError({ code: "UPLOAD_EXPIRED", message: "Invalid upload token" });
  }
  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature !== expectedSig) {
    throw new UploadError({ code: "UPLOAD_EXPIRED", message: "Invalid upload token" });
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as UploadMetadata;
  if (Date.now() > data.expiresAt) {
    throw new UploadError({ code: "UPLOAD_EXPIRED", message: "Upload token expired" });
  }
  return data;
}

// ─── Action Handlers ────────────────────────────────────────────────────────

/**
 * Handle an "upload" action: validate files against route config, run
 * middleware, generate file keys, create presigned URLs (simple or multipart),
 * and return them to the client with an encoded metadata token.
 */
export async function handleUploadRequest(
  req: Request,
  route: FileRoute<AnyParams>,
  body: unknown,
  config: S3Config,
  slug: string,
): Promise<Response> {
  const payload = body as UploadActionPayload;

  // 1. Validate files against route config
  const validation = validateFilesForRoute(payload.files, route._def.routerConfig);
  if (!validation.isValid) {
    throw new UploadError({
      code: validation.error!.code as UploadErrorCode,
      message: validation.error!.message,
      status: 400,
    });
  }

  // 2. Validate and parse input
  const input = await validateAndParseInput(route, payload.input);

  // 3. Run middleware
  const metadata = await runMiddleware(route, req, input);

  // 4. Generate file keys
  const fileKeys = generateFileKeys(payload.files);

  // 5. Generate presigned URLs (simple or multipart)
  const s3 = getS3Client(config);
  const responseFiles = await Promise.all(
    fileKeys.map(async (fk, i) => {
      const file = payload.files[i]!;
      const parts = calculateParts(file.size);

      if (!parts.isMultipart) {
        // Simple upload — single presigned PUT URL
        const url = await generatePresignedPutUrl(s3, {
          bucket: config.bucket,
          key: fk.key,
          contentType: file.type,
          contentDisposition: getContentDisposition(file.type),
        });
        return { key: fk.key, url, name: file.name, fileType: file.type };
      } else {
        // Multipart upload — create upload, generate part URLs
        const { uploadId } = await createMultipartUpload(s3, {
          bucket: config.bucket,
          key: fk.key,
          contentType: file.type,
        });
        const partUrls = await generatePresignedPartUrls(s3, {
          bucket: config.bucket,
          key: fk.key,
          uploadId,
          partCount: parts.partCount,
        });
        return {
          key: fk.key,
          name: file.name,
          fileType: file.type,
          uploadId,
          parts: partUrls,
          chunkSize: parts.partSize,
          chunkCount: parts.partCount,
        };
      }
    }),
  );

  // 6. Encode metadata token (includes original file info for callback resolution)
  const secret = config.secretAccessKey;
  const fileNames: Record<string, string> = {};
  const fileSizes: Record<string, number> = {};
  const fileTypes: Record<string, string> = {};
  const uploadIdMap: Record<string, string> = {};
  fileKeys.forEach((fk, i) => {
    const file = payload.files[i]!;
    fileNames[fk.key] = file.name;
    fileSizes[fk.key] = file.size;
    fileTypes[fk.key] = file.type;
    const rf = responseFiles[i]!;
    if (rf.uploadId) uploadIdMap[fk.key] = rf.uploadId;
  });

  const metadataToken = encodeMetadataToken(
    {
      fileKeys: fileKeys.map((fk) => fk.key),
      fileNames,
      fileSizes,
      fileTypes,
      metadata,
      routeSlug: slug,
      uploadIds: Object.keys(uploadIdMap).length > 0 ? uploadIdMap : undefined,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    },
    secret,
  );

  return Response.json({
    files: responseFiles,
    metadata: metadataToken,
  });
}

/**
 * Handle a "multipart-complete" action: verify the metadata token, complete
 * multipart uploads in S3, resolve file metadata via HeadObject, and invoke
 * the route's `onUploadComplete` callback for each file.
 *
 * Delegates to {@link handleUploadCallback} from `callback.ts` for the core
 * completion logic (token verification, metadata resolution, callback execution).
 */
export async function handleMultipartComplete(
  _req: Request,
  route: FileRoute<AnyParams>,
  body: unknown,
  config: S3Config,
): Promise<Response> {
  const { fileKeys, fileEtags, metadata: metadataToken } = body as {
    fileKeys: string[];
    fileEtags?: Record<string, Array<{ partNumber: number; etag: string }>>;
    metadata: string;
  };

  const results = await handleUploadCallback(route, config, metadataToken, {
    fileKeys,
    fileEtags,
  });

  return Response.json({ files: results });
}
