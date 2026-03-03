import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("Changeset Config (Task 41)", () => {
  it("changeset config exists", () => {
    const configPath = resolve(ROOT, ".changeset/config.json");

    expect(existsSync(configPath)).toBe(true);
  });

  it("changeset config is valid JSON", () => {
    const configPath = resolve(ROOT, ".changeset/config.json");
    const content = readFileSync(configPath, "utf-8");

    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("changeset config links all managed packages together", () => {
    const configPath = resolve(ROOT, ".changeset/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    const linked = config.linked as string[][];
    expect(linked).toBeDefined();
    expect(linked.length).toBeGreaterThanOrEqual(1);

    const linkedGroup = linked[0];
    expect(linkedGroup).toContain("s3-good");
    expect(linkedGroup).toContain("@s3-good/react");
    expect(linkedGroup).toContain("@s3-good-internal/shared");
    expect(linkedGroup).toContain("@s3-good/browser");
  });

  it("changeset config has public access", () => {
    const configPath = resolve(ROOT, ".changeset/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    expect(config.access).toBe("public");
  });
});
