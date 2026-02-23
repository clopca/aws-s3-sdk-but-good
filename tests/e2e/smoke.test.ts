import { describe, it, expect } from "vitest";
import { getTestPrefix, createTestFile, getTestConfig } from "./helpers";

describe("E2E smoke test", () => {
  it("getTestPrefix returns unique prefixes", () => {
    const prefix1 = getTestPrefix();
    const prefix2 = getTestPrefix();

    expect(prefix1).not.toBe(prefix2);
    expect(prefix1).toMatch(/^e2e-test-\d+-[a-z0-9]+\/$/);
    expect(prefix2).toMatch(/^e2e-test-\d+-[a-z0-9]+\/$/);
  });

  it("createTestFile creates buffer of correct size", () => {
    const file = createTestFile(1024);

    expect(file.buffer.length).toBe(1024);
    expect(file.size).toBe(1024);
    expect(file.name).toBe("test-file-1024.bin");
    expect(file.type).toBe("application/octet-stream");
  });

  it("createTestFile accepts custom MIME type", () => {
    const file = createTestFile(512, "text/plain");

    expect(file.type).toBe("text/plain");
  });

  it("getTestConfig reads from environment variables", () => {
    const config = getTestConfig();

    expect(config).toHaveProperty("region");
    expect(config).toHaveProperty("bucket");
    expect(config).toHaveProperty("accessKeyId");
    expect(config).toHaveProperty("secretAccessKey");
  });
});
