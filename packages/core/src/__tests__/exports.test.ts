import { describe, it, expect } from "vitest";

// ─── Tests: Server Exports ──────────────────────────────────────────────────

describe("server exports", () => {
  it("test_server_exports", async () => {
    // Arrange & Act
    const serverModule = await import("../server");

    // Assert — key server exports are present
    expect(serverModule).toHaveProperty("createUploader");
    expect(typeof serverModule.createUploader).toBe("function");

    expect(serverModule).toHaveProperty("createRouteHandler");
    expect(typeof serverModule.createRouteHandler).toBe("function");

    expect(serverModule).toHaveProperty("createBrowser");
    expect(typeof serverModule.createBrowser).toBe("function");

    expect(serverModule).toHaveProperty("createBrowserRouteHandler");
    expect(typeof serverModule.createBrowserRouteHandler).toBe("function");

    expect(serverModule).toHaveProperty("createRouteRegistry");
    expect(typeof serverModule.createRouteRegistry).toBe("function");

    // Middleware helpers
    expect(serverModule).toHaveProperty("getCookie");
    expect(typeof serverModule.getCookie).toBe("function");

    expect(serverModule).toHaveProperty("getBearerToken");
    expect(typeof serverModule.getBearerToken).toBe("function");

    expect(serverModule).toHaveProperty("getHeader");
    expect(typeof serverModule.getHeader).toBe("function");
  });
});

// ─── Tests: Client Exports ──────────────────────────────────────────────────

describe("client exports", () => {
  it("test_client_exports", async () => {
    // Arrange & Act
    const clientModule = await import("../client");

    // Assert
    expect(clientModule).toHaveProperty("genUploader");
    expect(typeof clientModule.genUploader).toBe("function");
  });
});

// ─── Tests: Types Exports ───────────────────────────────────────────────────

describe("types exports", () => {
  it("test_types_exports", async () => {
    // Arrange & Act
    const typesModule = await import("../types");

    // Assert — error classes (runtime values)
    expect(typesModule).toHaveProperty("UploadError");
    expect(typesModule).toHaveProperty("S3Error");

    // Type-only exports can't be checked at runtime, but we verify the module
    // loads without errors and has the expected shape. The type exports
    // (FileRouter, S3Config, UploadedFile, etc.) are verified by TypeScript
    // compilation — if they were missing, the build would fail.
    expect(typeof typesModule.UploadError).toBe("function");
    expect(typeof typesModule.S3Error).toBe("function");
  });
});

// ─── Tests: SDK Exports ─────────────────────────────────────────────────────

describe("sdk exports", () => {
  it("test_sdk_exports", async () => {
    // Arrange & Act
    const sdkModule = await import("../sdk/index");

    // Assert
    expect(sdkModule).toHaveProperty("S3Api");
    expect(typeof sdkModule.S3Api).toBe("function");

    expect(sdkModule).toHaveProperty("setupBucket");
    expect(typeof sdkModule.setupBucket).toBe("function");

    expect(sdkModule).toHaveProperty("validateBucketCors");
    expect(typeof sdkModule.validateBucketCors).toBe("function");
  });
});

// ─── Tests: Client has no server imports ────────────────────────────────────

describe("client isolation", () => {
  it("test_client_no_server_imports", async () => {
    // Arrange & Act — import client module
    const clientModule = await import("../client");

    // Assert — client module should NOT contain server-only exports
    // These are server-side functions that should never appear in client bundle
    const clientKeys = Object.keys(clientModule);

    expect(clientKeys).not.toContain("createUploader");
    expect(clientKeys).not.toContain("createRouteHandler");
    expect(clientKeys).not.toContain("handleUploadAction");
    expect(clientKeys).not.toContain("S3Api");
    expect(clientKeys).not.toContain("setupBucket");
    expect(clientKeys).not.toContain("getCookie");
    expect(clientKeys).not.toContain("getBearerToken");

    // Client should only have client-specific exports
    expect(clientKeys).toContain("genUploader");
  });
});
