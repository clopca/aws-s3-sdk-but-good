import { createRef } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FileItem } from "../components/file-item";
import { Breadcrumbs } from "../components/breadcrumbs";
import { SearchBar } from "../components/search-bar";
import { SelectionBar } from "../components/selection-bar";
import { Toolbar } from "../components/toolbar";
import { FileGrid } from "../components/file-grid";
import { FileListView } from "../components/file-list-view";
import type { BrowserFile } from "@s3-good-internal/shared";

describe("forwardRef + cn() on browser components", () => {
  afterEach(() => {
    cleanup();
  });

  it("test FileItem forwards ref", () => {
    const ref = createRef<HTMLButtonElement>();
    const item: BrowserFile = {
      kind: "file",
      key: "test.txt",
      name: "test.txt",
      size: 1024,
      contentType: "text/plain",
      lastModified: new Date("2026-01-01"),
    };

    render(
      <FileItem
        ref={ref}
        item={item}
        isSelected={false}
        viewMode="grid"
        onClick={() => {}}
        onDoubleClick={() => {}}
        onContextMenu={() => {}}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("test FileItem merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    const item: BrowserFile = {
      kind: "file",
      key: "test.txt",
      name: "test.txt",
      size: 1024,
      contentType: "text/plain",
      lastModified: new Date("2026-01-01"),
    };

    render(
      <FileItem
        ref={ref}
        item={item}
        isSelected={false}
        viewMode="grid"
        onClick={() => {}}
        onDoubleClick={() => {}}
        onContextMenu={() => {}}
        className="custom-test-class"
      />,
    );

    // The button should have both internal classes and the custom class
    const button = ref.current!;
    expect(button.className).toContain("custom-test-class");
    // Should also have internal classes (e.g. from cn() merge)
    expect(button.className).toContain("rounded-xl");
  });

  it("test FileItem has data-state", () => {
    const item: BrowserFile = {
      kind: "file",
      key: "test.txt",
      name: "test.txt",
      size: 1024,
      contentType: "text/plain",
      lastModified: new Date("2026-01-01"),
    };

    // Test unselected state
    const { unmount } = render(
      <FileItem
        item={item}
        isSelected={false}
        viewMode="grid"
        onClick={() => {}}
        onDoubleClick={() => {}}
        onContextMenu={() => {}}
      />,
    );

    const unselectedButton = document.querySelector("[data-state]");
    expect(unselectedButton).toBeTruthy();
    expect(unselectedButton?.getAttribute("data-state")).toBe("idle");

    unmount();

    // Test selected state
    render(
      <FileItem
        item={item}
        isSelected={true}
        viewMode="grid"
        onClick={() => {}}
        onDoubleClick={() => {}}
        onContextMenu={() => {}}
      />,
    );

    const selectedButton = document.querySelector("[data-state]");
    expect(selectedButton).toBeTruthy();
    expect(selectedButton?.getAttribute("data-state")).toBe("selected");
  });

  it("test components have displayName", () => {
    // All browser components that use forwardRef should have displayName set
    expect(FileItem.displayName).toBe("FileItem");
    expect(Breadcrumbs.displayName).toBe("Breadcrumbs");
    expect(SearchBar.displayName).toBe("SearchBar");
    expect(SelectionBar.displayName).toBe("SelectionBar");
    expect(Toolbar.displayName).toBe("Toolbar");
    expect(FileGrid.displayName).toBe("FileGrid");
    expect(FileListView.displayName).toBe("FileListView");
  });
});
