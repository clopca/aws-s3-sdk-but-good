import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

import { FileList } from "../components/file-list";
import type { FileItem } from "../components/file-list";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFileItem(overrides: Partial<FileItem> = {}): FileItem {
  return {
    id: "file-1",
    name: "document.pdf",
    size: 1_048_576, // 1 MB
    type: "application/pdf",
    progress: 0,
    status: "pending",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("FileList", () => {
  afterEach(() => {
    cleanup();
  });

  // ─── Basic Rendering ────────────────────────────────────────────────────

  it("test_renders_file_list_with_items", () => {
    const files: FileItem[] = [
      createFileItem({ id: "1", name: "file-a.pdf" }),
      createFileItem({ id: "2", name: "file-b.png" }),
      createFileItem({ id: "3", name: "file-c.txt" }),
    ];

    render(<FileList files={files} />);

    const list = screen.getByRole("list");
    expect(list).toBeTruthy();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("test_renders_file_names", () => {
    const files: FileItem[] = [
      createFileItem({ id: "1", name: "report.pdf" }),
      createFileItem({ id: "2", name: "photo.png" }),
    ];

    render(<FileList files={files} />);

    expect(screen.getByText("report.pdf")).toBeTruthy();
    expect(screen.getByText("photo.png")).toBeTruthy();
  });

  it("test_renders_formatted_file_sizes", () => {
    const files: FileItem[] = [
      createFileItem({ id: "1", size: 1_048_576 }), // 1 MB
      createFileItem({ id: "2", size: 1024 }), // 1 KB
    ];

    render(<FileList files={files} />);

    expect(screen.getByText("1 MB")).toBeTruthy();
    expect(screen.getByText("1 KB")).toBeTruthy();
  });

  it("test_renders_empty_list", () => {
    render(<FileList files={[]} />);

    const list = screen.getByRole("list");
    expect(list).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  // ─── Status Indicators ──────────────────────────────────────────────────

  it("test_shows_pending_status", () => {
    const files = [createFileItem({ id: "1", status: "pending" })];

    render(<FileList files={files} />);

    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("test_shows_uploading_status", () => {
    const files = [createFileItem({ id: "1", status: "uploading", progress: 50 })];

    render(<FileList files={files} />);

    expect(screen.getByText("Uploading")).toBeTruthy();
  });

  it("test_shows_complete_status", () => {
    const files = [createFileItem({ id: "1", status: "complete", progress: 100 })];

    render(<FileList files={files} />);

    expect(screen.getByText("Complete")).toBeTruthy();
  });

  it("test_shows_error_status", () => {
    const files = [createFileItem({ id: "1", status: "error", error: "Upload failed" })];

    render(<FileList files={files} />);

    expect(screen.getByText("Error")).toBeTruthy();
  });

  it("test_status_colors", () => {
    const files: FileItem[] = [
      createFileItem({ id: "1", status: "pending", name: "pending.pdf" }),
      createFileItem({ id: "2", status: "uploading", name: "uploading.pdf", progress: 50 }),
      createFileItem({ id: "3", status: "complete", name: "complete.pdf", progress: 100 }),
      createFileItem({ id: "4", status: "error", name: "error.pdf", error: "Failed" }),
    ];

    render(<FileList files={files} />);

    const pendingStatus = screen.getByText("Pending");
    expect(pendingStatus.className).toContain("text-muted-foreground");

    const uploadingStatus = screen.getByText("Uploading");
    expect(uploadingStatus.className).toContain("text-primary");

    const completeStatus = screen.getByText("Complete");
    expect(completeStatus.className).toContain("text-emerald-500");

    const errorStatus = screen.getByText("Error");
    expect(errorStatus.className).toContain("text-destructive");
  });

  // ─── Progress Bar ───────────────────────────────────────────────────────

  it("test_shows_progress_bar_for_uploading_files", () => {
    const files = [createFileItem({ id: "1", status: "uploading", progress: 60 })];

    render(<FileList files={files} showProgress={true} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeTruthy();
    expect(progressbar.getAttribute("aria-valuenow")).toBe("60");
  });

  it("test_no_progress_bar_for_pending_files", () => {
    const files = [createFileItem({ id: "1", status: "pending" })];

    render(<FileList files={files} showProgress={true} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("test_no_progress_bar_when_show_progress_false", () => {
    const files = [createFileItem({ id: "1", status: "uploading", progress: 50 })];

    render(<FileList files={files} showProgress={false} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  // ─── Remove Button ──────────────────────────────────────────────────────

  it("test_remove_button_calls_on_remove", () => {
    const onRemove = vi.fn();
    const files = [createFileItem({ id: "file-42", status: "pending", name: "test.pdf" })];

    render(<FileList files={files} onRemove={onRemove} showRemoveButton={true} />);

    const removeButton = screen.getByRole("button", { name: /remove test\.pdf/i });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith("file-42");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("test_no_remove_button_while_uploading", () => {
    const onRemove = vi.fn();
    const files = [createFileItem({ id: "1", status: "uploading", name: "uploading.pdf", progress: 50 })];

    render(<FileList files={files} onRemove={onRemove} showRemoveButton={true} />);

    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("test_no_remove_button_when_show_remove_false", () => {
    const onRemove = vi.fn();
    const files = [createFileItem({ id: "1", status: "pending" })];

    render(<FileList files={files} onRemove={onRemove} showRemoveButton={false} />);

    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("test_no_remove_button_when_no_on_remove", () => {
    const files = [createFileItem({ id: "1", status: "pending" })];

    render(<FileList files={files} showRemoveButton={true} />);

    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  // ─── Error Message Display ──────────────────────────────────────────────

  it("test_shows_error_message", () => {
    const files = [createFileItem({ id: "1", status: "error", error: "Upload failed" })];

    render(<FileList files={files} />);

    expect(screen.getByText("Upload failed")).toBeTruthy();
  });

  it("test_no_error_message_for_non_error_files", () => {
    const files = [createFileItem({ id: "1", status: "pending" })];

    render(<FileList files={files} />);

    expect(screen.queryByText("Upload failed")).toBeNull();
  });

  // ─── Accessibility ──────────────────────────────────────────────────────

  it("test_container_has_list_role", () => {
    render(<FileList files={[createFileItem()]} />);

    const list = screen.getByRole("list");
    expect(list).toBeTruthy();
  });

  it("test_items_have_listitem_role", () => {
    const files = [
      createFileItem({ id: "1" }),
      createFileItem({ id: "2" }),
    ];

    render(<FileList files={files} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });

  it("test_remove_button_has_aria_label", () => {
    const files = [createFileItem({ id: "1", name: "report.pdf", status: "pending" })];

    render(<FileList files={files} onRemove={() => {}} showRemoveButton={true} />);

    const button = screen.getByRole("button", { name: "Remove report.pdf" });
    expect(button).toBeTruthy();
  });

  // ─── Data Attributes ───────────────────────────────────────────────────

  it("test_items_have_data_status_attribute", () => {
    const files: FileItem[] = [
      createFileItem({ id: "1", status: "pending" }),
      createFileItem({ id: "2", status: "complete", progress: 100 }),
    ];

    render(<FileList files={files} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]?.getAttribute("data-status")).toBe("pending");
    expect(items[1]?.getAttribute("data-status")).toBe("complete");
  });

  // ─── Item Styling by Status ─────────────────────────────────────────────

  it("test_error_item_has_error_styling", () => {
    const files = [createFileItem({ id: "1", status: "error", error: "Failed" })];

    render(<FileList files={files} />);

    const item = screen.getByRole("listitem");
    expect(item.className).toContain("border-destructive/30");
    expect(item.className).toContain("bg-destructive/10");
  });

  it("test_complete_item_has_complete_styling", () => {
    const files = [createFileItem({ id: "1", status: "complete", progress: 100 })];

    render(<FileList files={files} />);

    const item = screen.getByRole("listitem");
    expect(item.className).toContain("border-emerald-500/30");
    expect(item.className).toContain("bg-emerald-500/10");
  });

  // ─── Theming Support ──────────────────────────────────────────────────

  it("test_appearance_container_classname", () => {
    const files = [createFileItem()];

    const { container } = render(
      <FileList
        files={files}
        appearance={{ container: "my-file-list" }}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("my-file-list");
    // When a class name is used, inline styles should be skipped
    expect(root.style.display).toBe("");
  });

  it("test_classname_prop", () => {
    const files = [createFileItem()];

    const { container } = render(
      <FileList files={files} className="custom-list" />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("custom-list");
  });
});
