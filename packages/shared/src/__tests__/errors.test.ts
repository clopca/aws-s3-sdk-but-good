import { describe, it, expect } from "vitest";
import { UploadError, S3Error } from "../errors";

describe("UploadError", () => {
  it("has the correct error code", () => {
    const error = new UploadError({
      code: "FILE_TOO_LARGE",
      message: "File exceeds limit",
    });

    expect(error.code).toBe("FILE_TOO_LARGE");
  });

  it("has the correct status from constructor", () => {
    const error = new UploadError({
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      status: 400,
    });

    expect(error.status).toBe(400);
  });

  it("uses default status when not provided", () => {
    const error = new UploadError({
      code: "FILE_TOO_LARGE",
      message: "File exceeds limit",
    });

    expect(error.status).toBe(400);
  });

  it("extends Error", () => {
    const error = new UploadError({
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("UploadError");
  });
});

describe("S3Error", () => {
  it("wraps the original error", () => {
    const originalError = new Error("AWS SDK failure");
    const error = new S3Error("S3 operation failed", originalError);

    expect(error.originalError).toBe(originalError);
    expect(error.message).toBe("S3 operation failed");
    expect(error.name).toBe("S3Error");
  });

  it("works without an original error", () => {
    const error = new S3Error("S3 operation failed");

    expect(error.originalError).toBeUndefined();
    expect(error.message).toBe("S3 operation failed");
  });
});
