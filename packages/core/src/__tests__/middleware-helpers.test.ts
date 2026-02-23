import { describe, it, expect } from "vitest";
import { getCookie, getBearerToken, getHeader } from "../_internal/middleware-helpers";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/upload", { headers });
}

// ─── getBearerToken ─────────────────────────────────────────────────────────

describe("getBearerToken", () => {
  it("test_getBearerToken_valid", () => {
    // Arrange
    const req = makeRequest({ Authorization: "Bearer abc" });

    // Act
    const result = getBearerToken(req);

    // Assert
    expect(result).toBe("abc");
  });

  it("test_getBearerToken_missing", () => {
    // Arrange
    const req = makeRequest();

    // Act
    const result = getBearerToken(req);

    // Assert
    expect(result).toBeUndefined();
  });

  it("test_getBearerToken_wrong_scheme", () => {
    // Arrange
    const req = makeRequest({ Authorization: "Basic abc" });

    // Act
    const result = getBearerToken(req);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ─── getCookie ──────────────────────────────────────────────────────────────

describe("getCookie", () => {
  it("test_getCookie_found", () => {
    // Arrange
    const req = makeRequest({ Cookie: "session=xyz; other=123" });

    // Act
    const result = getCookie(req, "session");

    // Assert
    expect(result).toBe("xyz");
  });

  it("test_getCookie_not_found", () => {
    // Arrange
    const req = makeRequest({ Cookie: "other=123" });

    // Act
    const result = getCookie(req, "session");

    // Assert
    expect(result).toBeUndefined();
  });

  it("test_getCookie_no_cookies", () => {
    // Arrange
    const req = makeRequest();

    // Act
    const result = getCookie(req, "session");

    // Assert
    expect(result).toBeUndefined();
  });
});

// ─── getHeader ──────────────────────────────────────────────────────────────

describe("getHeader", () => {
  it("returns the header value when present", () => {
    // Arrange
    const req = makeRequest({ "x-api-key": "my-key-123" });

    // Act
    const result = getHeader(req, "x-api-key");

    // Assert
    expect(result).toBe("my-key-123");
  });

  it("returns undefined when header is missing", () => {
    // Arrange
    const req = makeRequest();

    // Act
    const result = getHeader(req, "x-api-key");

    // Assert
    expect(result).toBeUndefined();
  });
});
