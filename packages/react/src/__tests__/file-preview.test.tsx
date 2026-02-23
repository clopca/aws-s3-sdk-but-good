import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

import { FilePreview } from "../components/file-preview";

// ─── URL.createObjectURL / revokeObjectURL Mocks ────────────────────────────

const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...globalThis.URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

afterEach(() => {
  cleanup();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
  vi.restoreAllMocks();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function createImageFile(name = "photo.png", size = 4096): File {
  return new File(["x".repeat(size)], name, { type: "image/png" });
}

function createNonImageFile(name = "report.pdf", size = 2048): File {
  return new File(["x".repeat(size)], name, { type: "application/pdf" });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("FilePreview", () => {
  // ─── Image File Rendering ───────────────────────────────────────────────

  it("test_image_file_shows_thumbnail", () => {
    const file = createImageFile("photo.png");

    render(<FilePreview file={file} />);

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("blob:mock-url");
    expect(img.getAttribute("alt")).toBe("photo.png");
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
  });

  // ─── Non-Image File Rendering ───────────────────────────────────────────

  it("test_non_image_file_shows_icon", () => {
    const file = createNonImageFile("report.pdf");

    const { container } = render(<FilePreview file={file} />);

    // Should NOT have an <img> element
    expect(screen.queryByRole("img")).toBeNull();

    // Should have an SVG icon element (the FileIcon)
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    // URL.createObjectURL should NOT be called for non-image files
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  // ─── URL Image Rendering ──────────────────────────────────────────────

  it("test_url_image_shows_thumbnail", () => {
    const url = "https://example.com/photo.jpg";

    render(<FilePreview file={url} />);

    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe(url);
    expect(img.getAttribute("alt")).toBe("photo.jpg");

    // URL.createObjectURL should NOT be called for URL strings
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  // ─── URL Non-Image Rendering ──────────────────────────────────────────

  it("test_url_non_image_shows_icon", () => {
    const url = "https://example.com/doc.pdf";

    const { container } = render(<FilePreview file={url} />);

    // Should NOT have an <img> element
    expect(screen.queryByRole("img")).toBeNull();

    // Should have an SVG icon element
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  // ─── File Name and Size Display ───────────────────────────────────────

  it("test_displays_file_name_and_size", () => {
    const file = createNonImageFile("report.pdf", 2048);

    render(<FilePreview file={file} />);

    expect(screen.getByText("report.pdf")).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
  });

  // ─── URL File Name Extraction ─────────────────────────────────────────

  it("test_url_extracts_filename", () => {
    const url = "https://example.com/uploads/my-document.pdf";

    render(<FilePreview file={url} />);

    expect(screen.getByText("my-document.pdf")).toBeTruthy();
  });

  // ─── Appearance Override ──────────────────────────────────────────────

  it("test_appearance_override", () => {
    const file = createNonImageFile("report.pdf");

    const { container } = render(
      <FilePreview
        file={file}
        appearance={{
          container: { border: "2px solid red" },
        }}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.border).toBe("2px solid red");
    // Default classes are still applied in Tailwind-first mode
    expect(root.className).toContain("flex");
  });
});
