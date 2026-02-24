import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserItem } from "@s3-good/shared";
import { FileGrid } from "../components/file-grid";
import { FileListView } from "../components/file-list-view";

function makeItems(count: number): BrowserItem[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: "file" as const,
    key: `file-${String(i).padStart(4, "0")}.txt`,
    name: `file-${String(i).padStart(4, "0")}.txt`,
    size: i + 1,
    lastModified: new Date("2026-01-01T00:00:00.000Z"),
    contentType: "text/plain",
  }));
}

/**
 * Count FileItem elements in the DOM. FileItem renders `<button>` with a
 * `data-state` attribute ("selected" | "idle") which distinguishes them from
 * other buttons like sort headers.
 */
function countFileItems(container: HTMLElement): number {
  return container.querySelectorAll("button[data-state]").length;
}

describe("Virtualization (Task 17)", () => {
  afterEach(() => {
    cleanup();
  });

  it("test FileListView renders only visible items", () => {
    const items = makeItems(1000);

    const { container } = render(
      <FileListView
        items={items}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{
          enabled: true,
          threshold: 1,
          rowHeight: 46,
          overscan: 3,
        }}
      />,
    );

    const fileItemCount = countFileItems(container);

    expect(fileItemCount).toBeGreaterThan(0);
    expect(fileItemCount).toBeLessThan(1000);
  });

  it("test FileGrid renders only visible items", () => {
    const items = makeItems(1000);

    const { container } = render(
      <FileGrid
        items={items}
        selectedKeys={new Set()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{
          enabled: true,
          threshold: 1,
          itemMinWidth: 140,
          rowHeight: 152,
          overscanRows: 1,
        }}
      />,
    );

    const fileItemCount = countFileItems(container);

    expect(fileItemCount).toBeGreaterThan(0);
    expect(fileItemCount).toBeLessThan(1000);
  });

  it("test FileListView renders items on scroll", () => {
    const items = makeItems(500);

    const { container } = render(
      <FileListView
        items={items}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{
          enabled: true,
          threshold: 1,
          rowHeight: 46,
          overscan: 3,
        }}
      />,
    );

    // First item should be visible
    expect(screen.getByText("file-0000.txt")).toBeTruthy();

    // Last item should NOT be visible initially
    expect(screen.queryByText("file-0499.txt")).toBeNull();

    // Scroll the container down
    const scrollContainer = container.querySelector(".overflow-auto");
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 20000 } });
    }

    // After scroll, items still render (scroll doesn't crash)
    const fileItemCount = countFileItems(container);
    expect(fileItemCount).toBeGreaterThan(0);
  });

  it("test selection works on virtualized items", () => {
    const items = makeItems(200);
    const onItemClick = vi.fn();

    render(
      <FileListView
        items={items}
        selectedKeys={new Set(["file-0000.txt"])}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={onItemClick}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{
          enabled: true,
          threshold: 1,
          rowHeight: 46,
          overscan: 3,
        }}
      />,
    );

    // The first item should be rendered and selectable
    const firstItem = screen.getByText("file-0000.txt");
    expect(firstItem).toBeTruthy();

    // Click the item
    fireEvent.click(firstItem);
    expect(onItemClick).toHaveBeenCalledWith(
      "file-0000.txt",
      expect.anything(),
    );
  });
});
