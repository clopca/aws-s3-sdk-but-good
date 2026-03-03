import { createUploader } from "s3-good/server";
import type { FileRouter } from "s3-good/server";
import { z } from "zod";

const f = createUploader();

/**
 * Upload router definition — each key becomes a named endpoint
 * that clients can reference with full type safety.
 */
export const uploadRouter = {
  // ── Image uploader ────────────────────────────────────────────────────
  // Accepts up to 4 images, max 4MB each.
  // Demonstrates: middleware with auth extraction.
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .middleware(async ({ req }) => {
      // Example: extract user from header (replace with real auth in production)
      const userId = req.headers.get("x-user-id") ?? "anonymous";
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image uploaded by:", metadata.userId);
      console.log("File URL:", file.url);
      return { url: file.url };
    }),

  // ── Document uploader ─────────────────────────────────────────────────
  // Accepts PDFs (16MB) and text files (1MB).
  // Demonstrates: .input() with Zod validation + middleware using input.
  documentUploader: f({
    pdf: { maxFileSize: "16MB" },
    text: { maxFileSize: "1MB" },
  })
    .input(
      z.object({
        category: z.string(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .middleware(async ({ input }) => {
      return { category: input.category, tags: input.tags ?? [] };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document uploaded:", file.name, "category:", metadata.category);
      return { url: file.url, category: metadata.category };
    }),

  // ── Video uploader ────────────────────────────────────────────────────
  // Accepts videos up to 256MB.
  // Demonstrates: large file upload endpoint.
  videoUploader: f({ video: { maxFileSize: "256MB" } })
    .middleware(async () => {
      return { userId: "demo-user" };
    })
    .onUploadComplete(async ({ file }) => {
      console.log("Video uploaded:", file.url);
      return { url: file.url };
    }),

  // ── Any file uploader ─────────────────────────────────────────────────
  // Accepts any file type (blob), up to 10 files, 32MB each.
  // Demonstrates: catch-all endpoint with high file count.
  anyFileUploader: f({ blob: { maxFileSize: "32MB", maxFileCount: 10 } })
    .middleware(async () => ({}))
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
