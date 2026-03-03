import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserItem } from "@s3-good-internal/shared";
import {
  EmptyState,
  FileGrid,
  FileListView,
  SearchBar,
  Toolbar,
} from "../components";

const items: BrowserItem[] = [
  { kind: "folder", key: "photos/", name: "photos" },
  {
    kind: "file",
    key: "notes.txt",
    name: "notes.txt",
    size: 128,
    lastModified: new Date("2026-01-01T00:00:00.000Z"),
    contentType: "text/plain",
  },
];

describe("file views components", () => {
  afterEach(() => {
    cleanup();
  });

  it("test_FileGrid_renders_items_and_callbacks", () => {
    const onItemClick = vi.fn();
    const onItemDoubleClick = vi.fn();
    const onItemContextMenu = vi.fn();

    render(
      <FileGrid
        items={items}
        selectedKeys={new Set()}
        onItemClick={onItemClick}
        onItemDoubleClick={onItemDoubleClick}
        onItemContextMenu={onItemContextMenu}
        isLoading={false}
      />,
    );

    const folder = screen.getByRole("option", { name: "Folder photos" });
    fireEvent.click(folder);
    expect(onItemClick).toHaveBeenCalled();
  });

  it("test_FileGrid_supports_keyboard_context_menu_shortcut", () => {
    const onItemContextMenu = vi.fn();

    const { container } = render(
      <FileGrid
        items={items}
        selectedKeys={new Set([items[0]!.key])}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={onItemContextMenu}
        isLoading={false}
      />,
    );

    const folder = within(container).getByRole("option", { name: "Folder photos" });
    fireEvent.keyDown(folder, { key: "F10", shiftKey: true });

    expect(onItemContextMenu).toHaveBeenCalled();
    expect(folder.getAttribute("aria-selected")).toBe("true");
  });

  it("test_FileGrid_virtualization_renders_visible_subset", () => {
    const manyItems: BrowserItem[] = Array.from({ length: 260 }).map((_, index) => ({
      kind: "file",
      key: `grid-file-${index}.txt`,
      name: `grid-file-${index}.txt`,
      size: index + 1,
      lastModified: new Date("2026-01-01T00:00:00.000Z"),
      contentType: "text/plain",
    }));

    render(
      <FileGrid
        items={manyItems}
        selectedKeys={new Set()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{ enabled: true, threshold: 1, itemMinWidth: 140, rowHeight: 152, overscanRows: 1 }}
      />,
    );

    expect(screen.getByText("grid-file-0.txt")).toBeTruthy();
    expect(screen.queryByText("grid-file-259.txt")).toBeNull();
  });

  it("test_FileListView_renders_headers_and_sort", () => {
    const onSort = vi.fn();

    render(
      <FileListView
        items={items}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={onSort}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Name/i }));
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("test_FileListView_virtualization_renders_visible_subset", () => {
    const manyItems: BrowserItem[] = Array.from({ length: 220 }).map((_, index) => ({
      kind: "file",
      key: `file-${index}.txt`,
      name: `file-${index}.txt`,
      size: index + 1,
      lastModified: new Date("2026-01-01T00:00:00.000Z"),
      contentType: "text/plain",
    }));

    render(
      <FileListView
        items={manyItems}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
        virtualization={{ enabled: true, threshold: 1, rowHeight: 46, overscan: 6 }}
      />,
    );

    expect(screen.getByText("file-0.txt")).toBeTruthy();
    expect(screen.queryByText("file-219.txt")).toBeNull();
  });

  it("test_FileListView_loading_to_loaded_keeps_hook_order", () => {
    const { rerender } = render(
      <FileListView
        items={[]}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading
      />,
    );

    rerender(
      <FileListView
        items={items}
        selectedKeys={new Set()}
        sort={{ field: "name", direction: "asc" }}
        onSort={vi.fn()}
        onItemClick={vi.fn()}
        onItemDoubleClick={vi.fn()}
        onItemContextMenu={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByText("notes.txt")).toBeTruthy();
  });

  it("test_EmptyState_messages", () => {
    const { rerender } = render(<EmptyState />);
    expect(screen.getByText("This folder is empty")).toBeTruthy();

    rerender(<EmptyState isSearching />);
    expect(screen.getByText("No files match your search")).toBeTruthy();
  });

  it("test_Toolbar_and_SearchBar_actions", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    const onSortChange = vi.fn();
    const onCreateFolder = vi.fn();
    const onDeleteSelected = vi.fn();
    const onUploadFiles = vi.fn();
    const onRefresh = vi.fn();
    const onSearch = vi.fn();

    render(
      <>
        <Toolbar
          viewMode="grid"
          sort={{ field: "name", direction: "asc" }}
          selectedCount={1}
          onViewModeChange={onViewModeChange}
          onSortChange={onSortChange}
          onCreateFolder={onCreateFolder}
          onDeleteSelected={onDeleteSelected}
          onUploadFiles={onUploadFiles}
          onRefresh={onRefresh}
        />
        <SearchBar value="" onChange={onSearch} />
      </>,
    );

    await user.click(screen.getByRole("radio", { name: "List view" }));
    expect(onViewModeChange).toHaveBeenCalledWith("list");

    // Base UI Select requires realistic user events to trigger onValueChange
    const sortTrigger = screen.getByRole("combobox");
    await user.click(sortTrigger);
    const listbox = await screen.findByRole("listbox");
    const sizeOption = within(listbox).getByText("Size");
    await user.click(sizeOption);
    expect(onSortChange).toHaveBeenCalledWith("size");

    await user.click(screen.getByRole("button", { name: "New Folder" }));
    expect(onCreateFolder).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Delete/i }));
    expect(onDeleteSelected).toHaveBeenCalled();

    const uploadInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const uploadFile = new File(["hello"], "upload.txt", { type: "text/plain" });
    await user.upload(uploadInput, uploadFile);
    expect(onUploadFiles).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Search files..."), { target: { value: "cat" } });
    expect(onSearch).toHaveBeenCalledWith("cat");
  });
});
