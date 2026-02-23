import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserStore } from "../state";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useBrowser } from "../hooks/use-browser";
import { useSearch } from "../hooks/use-search";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("browser hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [],
      isTruncated: false,
    }), { status: 200 }));
  });

  it("test_useBrowser_returns_state_and_actions", async () => {
    const { result } = renderHook(() => useBrowser());

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(result.current).toHaveProperty("items");
    expect(result.current).toHaveProperty("refresh");
    expect(result.current).toHaveProperty("navigateTo");
    expect(typeof result.current.refresh).toBe("function");
  });

  it("test_useBrowser_auto_fetches_on_mount", async () => {
    renderHook(() => useBrowser({ url: "/api/browser" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/browser");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body ?? "")).toContain('"action":"list"');
  });

  it("test_useBrowser_change_bucket_resets_state_and_refetches", async () => {
    const { result } = renderHook(() => useBrowser({
      url: "/api/browser",
      config: { buckets: ["bucket-a", "bucket-b"], defaultBucket: "bucket-a" },
    }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.navigateTo("photos/");
      result.current.select("photos/a.jpg");
      result.current.setPreviewItem({
        kind: "file",
        key: "photos/a.jpg",
        name: "a.jpg",
        size: 1,
        contentType: "image/jpeg",
        lastModified: new Date("2026-01-01T00:00:00.000Z"),
      });
      result.current.setActiveBucket("bucket-b");
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
    expect(secondBody.bucket).toBe("bucket-b");

    expect(result.current.activeBucket).toBe("bucket-b");
    expect(result.current.currentPath).toBe("");
    expect(result.current.selectedKeys.size).toBe(0);
    expect(result.current.previewItem).toBeNull();
  });

  it("test_useBrowser_invalid_default_bucket_falls_back_to_first_allowed", async () => {
    const { result } = renderHook(() => useBrowser({
      url: "/api/browser",
      config: { buckets: ["bucket-a", "bucket-b"], defaultBucket: "invalid-bucket" },
    }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(firstBody.bucket).toBe("bucket-a");
    expect(result.current.activeBucket).toBe("bucket-a");
  });

  it("test_useBrowser_deleteSelected_allows_folder_keys", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [{ kind: "folder", key: "photos/", name: "photos" }],
      isTruncated: false,
    }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "delete",
      success: true,
      deleted: ["photos/"],
    }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      action: "list",
      success: true,
      items: [],
      isTruncated: false,
    }), { status: 200 }));

    const { result } = renderHook(() => useBrowser({ url: "/api/browser" }));

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    act(() => {
      result.current.select("photos/");
    });

    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("test_useBreadcrumbs_root", () => {
    const { result } = renderHook(() => useBreadcrumbs(""));
    expect(result.current).toEqual([{ label: "Root", path: "" }]);
  });

  it("test_useBreadcrumbs_nested_and_rootPrefix", () => {
    const { result } = renderHook(() => useBreadcrumbs("root/a/b/", "root/"));

    expect(result.current).toEqual([
      { label: "Root", path: "root/" },
      { label: "a", path: "root/a/" },
      { label: "b", path: "root/a/b/" },
    ]);
  });

  it("test_useSearch_debounces", () => {
    vi.useFakeTimers();
    const store = createBrowserStore();

    const { result } = renderHook(() => useSearch(store, 200));

    act(() => {
      result.current.handleChange("pho");
      result.current.handleChange("photo");
    });

    expect(store.getState().searchQuery).toBe("");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(store.getState().searchQuery).toBe("photo");
    vi.useRealTimers();
  });

  it("test_useSearch_clear", () => {
    vi.useFakeTimers();
    const store = createBrowserStore();
    const { result } = renderHook(() => useSearch(store, 100));

    act(() => {
      result.current.handleChange("abc");
      result.current.clear();
      vi.advanceTimersByTime(100);
    });

    expect(result.current.inputValue).toBe("");
    expect(store.getState().searchQuery).toBe("");
    vi.useRealTimers();
  });
});
