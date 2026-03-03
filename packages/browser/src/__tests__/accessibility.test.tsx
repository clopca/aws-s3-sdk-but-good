import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserItem } from "@s3-good-internal/shared";
import { FileGrid } from "../components/file-grid";
import { FileListView } from "../components/file-list-view";
import { SelectionBar } from "../components/selection-bar";
import { Toolbar } from "../components/toolbar";

function makeItems(count: number): BrowserItem[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: "file" as const,
    key: `file-${i}.txt`,
    name: `file-${i}.txt`,
    size: i + 1,
    lastModified: new Date("2026-01-01T00:00:00.000Z"),
    contentType: "text/plain",
  }));
}

describe("Accessibility (Task 21)", () => {
  afterEach(() => {
    cleanup();
  });

  it("test FileGrid has role listbox and options", () => {
    render(
      <FileGrid
        items={makeItems(5)}
        selectedKeys={new Set(["file-1.txt"])}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("listbox", { name: "File grid" })).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(5);
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
  });

  it("test FileListView has role listbox", () => {
    render(
      <FileListView
        items={makeItems(4)}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("listbox", { name: "File list" })).toBeTruthy();
  });

  it("test arrow keys move focus in list view", () => {
    render(
      <FileListView
        items={makeItems(3)}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    const listbox = screen.getByRole("listbox", { name: "File list" });
    const first = within(listbox).getByRole("option", { name: /file-0.txt/i });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });

    const second = within(listbox).getByRole("option", { name: /file-1.txt/i });
    expect(first.getAttribute("tabindex")).toBe("-1");
    expect(second.getAttribute("tabindex")).toBe("0");
  });

  it("test Enter activates focused item", () => {
    const onItemDoubleClick = vi.fn();

    render(
      <FileListView
        items={makeItems(3)}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={onItemDoubleClick}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    const listbox = screen.getByRole("listbox", { name: "File list" });
    const first = within(listbox).getByRole("option", { name: /file-0.txt/i });
    fireEvent.keyDown(first, { key: "Enter" });

    expect(onItemDoubleClick).toHaveBeenCalledTimes(1);
  });

  it("test toolbar has view mode radiogroup", () => {
    render(
      <Toolbar
        viewMode="grid"
        sort={{ field: "name", direction: "asc" }}
        selectedCount={0}
        onViewModeChange={vi.fn()}
        onSortChange={vi.fn()}
        onCreateFolder={vi.fn()}
        onDeleteSelected={vi.fn()}
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "View mode" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Grid view" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "List view" })).toBeTruthy();
  });

  it("test selection bar announces updates", () => {
    render(<SelectionBar count={2} onClear={vi.fn()} onDelete={vi.fn()} />);
    const text = screen.getByText("2 selected");
    expect(text.getAttribute("aria-live")).toBe("polite");
  });
});
