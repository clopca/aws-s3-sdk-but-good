import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserItem, SortConfig } from "s3-good/types";
import { sortAndFilterItems } from "../state";
import { useBrowser } from "../hooks/use-browser";

// ---------------------------------------------------------------------------
// sortAndFilterItems — pure function tests
// ---------------------------------------------------------------------------

const folder: BrowserItem = { kind: "folder", key: "photos/", name: "photos" };
const fileA: BrowserItem = {
  kind: "file",
  key: "alpha.txt",
  name: "alpha.txt",
  size: 100,
  lastModified: new Date("2026-01-01"),
  contentType: "text/plain",
};
const fileB: BrowserItem = {
  kind: "file",
  key: "beta.png",
  name: "beta.png",
  size: 500,
  lastModified: new Date("2026-06-01"),
  contentType: "image/png",
};
const fileC: BrowserItem = {
  kind: "file",
  key: "charlie.pdf",
  name: "charlie.pdf",
  size: 200,
  lastModified: new Date("2026-03-01"),
  contentType: "application/pdf",
};

describe("sortAndFilterItems pure function (Task 18)", () => {
  it("test sorts folders first regardless of sort field", () => {
    const items = [fileA, folder, fileB];
    const sort: SortConfig = { field: "name", direction: "asc" };

    const result = sortAndFilterItems(items, sort, "");

    expect(result[0]).toBe(folder);
    expect(result[0]!.kind).toBe("folder");
  });

  it("test sorts files by name ascending", () => {
    const items = [fileC, fileA, fileB];
    const sort: SortConfig = { field: "name", direction: "asc" };

    const result = sortAndFilterItems(items, sort, "");

    expect(result.map((i) => i.name)).toEqual([
      "alpha.txt",
      "beta.png",
      "charlie.pdf",
    ]);
  });

  it("test sorts files by size descending", () => {
    const items = [fileA, fileB, fileC];
    const sort: SortConfig = { field: "size", direction: "desc" };

    const result = sortAndFilterItems(items, sort, "");

    expect(result.map((i) => i.name)).toEqual([
      "beta.png",
      "charlie.pdf",
      "alpha.txt",
    ]);
  });

  it("test filters items by search query", () => {
    const items = [folder, fileA, fileB, fileC];
    const sort: SortConfig = { field: "name", direction: "asc" };

    const result = sortAndFilterItems(items, sort, "alpha");

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("alpha.txt");
  });

  it("test search is case-insensitive", () => {
    const items = [fileA, fileB];
    const sort: SortConfig = { field: "name", direction: "asc" };

    const result = sortAndFilterItems(items, sort, "BETA");

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("beta.png");
  });

  it("test empty search returns all items sorted", () => {
    const items = [fileB, folder, fileA];
    const sort: SortConfig = { field: "name", direction: "asc" };

    const result = sortAndFilterItems(items, sort, "");

    expect(result).toHaveLength(3);
    // Folder first, then files alphabetically
    expect(result.map((i) => i.name)).toEqual([
      "photos",
      "alpha.txt",
      "beta.png",
    ]);
  });
});

// ---------------------------------------------------------------------------
// useBrowser memoization tests
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("useBrowser memoization (Task 18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          action: "list",
          success: true,
          items: [],
          isTruncated: false,
        }),
        { status: 200 },
      ),
    );
  });

  it("test sorted items memoized when deps unchanged", async () => {
    const { result, rerender } = renderHook(() => useBrowser());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const items1 = result.current.items;

    // Re-render without changing anything
    rerender();

    const items2 = result.current.items;

    // Same reference because deps haven't changed
    expect(Object.is(items1, items2)).toBe(true);
  });

  it("test sorted items recomputed on sort change", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          action: "list",
          success: true,
          items: [
            {
              kind: "file",
              key: "a.txt",
              name: "a.txt",
              size: 10,
              lastModified: "2026-01-01T00:00:00.000Z",
              contentType: "text/plain",
            },
            {
              kind: "file",
              key: "b.txt",
              name: "b.txt",
              size: 20,
              lastModified: "2026-02-01T00:00:00.000Z",
              contentType: "text/plain",
            },
          ],
          isTruncated: false,
        }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useBrowser());

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    const items1 = result.current.items;

    // Change sort field — should produce a new reference
    act(() => {
      result.current.setSort("size", "desc");
    });

    await waitFor(() => {
      expect(result.current.sort.field).toBe("size");
    });

    const items2 = result.current.items;

    expect(Object.is(items1, items2)).toBe(false);
  });

  it("test callbacks are stable across renders", async () => {
    const { result, rerender } = renderHook(() => useBrowser());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const navigateTo1 = result.current.navigateTo;
    const openFolder1 = result.current.openFolder;
    const select1 = result.current.select;

    // Re-render without changing anything
    rerender();

    expect(Object.is(result.current.navigateTo, navigateTo1)).toBe(true);
    expect(Object.is(result.current.openFolder, openFolder1)).toBe(true);
    expect(Object.is(result.current.select, select1)).toBe(true);
  });
});
