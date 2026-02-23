import { describe, it, expect } from "vitest";
import { createUploader } from "../server";

describe("createUploader", () => {
  it("returns a function", () => {
    const f = createUploader();
    expect(typeof f).toBe("function");
  });

  it("f() returns an UploadBuilder", () => {
    const f = createUploader();
    const builder = f({ image: { maxFileSize: "4MB" } });

    // Builder should have the chainable methods
    expect(typeof builder.input).toBe("function");
    expect(typeof builder.middleware).toBe("function");
    expect(typeof builder.onUploadComplete).toBe("function");
  });

  it("supports full router definition pattern", () => {
    const f = createUploader();

    const uploadRouter = {
      imageUploader: f({ image: { maxFileSize: "4MB" } })
        .middleware(() => ({ userId: "user_123" }))
        .onUploadComplete(({ metadata, file }) => {
          return { url: file.url, userId: metadata.userId };
        }),

      pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 5 } })
        .middleware(() => ({ orgId: "org_456" }))
        .onUploadComplete(({ metadata }) => {
          return { orgId: metadata.orgId };
        }),

      blobUploader: f({ blob: { maxFileSize: "32MB" } })
        .middleware(() => ({}))
        .onUploadComplete(() => undefined),
    };

    // All routes should be FileRoute objects with _def
    expect(uploadRouter.imageUploader).toHaveProperty("_def");
    expect(uploadRouter.pdfUploader).toHaveProperty("_def");
    expect(uploadRouter.blobUploader).toHaveProperty("_def");

    // Verify route configs are preserved
    expect(uploadRouter.imageUploader._def.routerConfig).toEqual({
      image: { maxFileSize: "4MB" },
    });
    expect(uploadRouter.pdfUploader._def.routerConfig).toEqual({
      pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    });
  });
});
