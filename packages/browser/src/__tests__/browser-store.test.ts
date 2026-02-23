import { describe, expect, it, vi } from "vitest";
import type { BrowserItem } from "@s3-good/shared";
import { createBrowserStore } from "../state";

describe("browser store", () => {
  it("test_createBrowserStore_default_state", () => {
    const store = createBrowserStore();
    const state = store.getState();

    expect(state.currentPath).toBe("");
    expect(state.viewMode).toBe("grid");
    expect(state.items).toEqual([]);
    expect(state.selectedKeys.size).toBe(0);
  });

  it("test_navigate_updates_path_and_clears", () => {
    const store = createBrowserStore();
    store.setState({
      items: [{ kind: "folder", key: "a/", name: "a" }],
      selectedKeys: new Set(["a/"]),
      hasMore: true,
      continuationToken: "abc",
    });

    store.navigate("photos/");

    const state = store.getState();
    expect(state.currentPath).toBe("photos/");
    expect(state.items).toEqual([]);
    expect(state.selectedKeys.size).toBe(0);
    expect(state.continuationToken).toBeUndefined();
  });

  it("test_goBack_and_goForward", () => {
    const store = createBrowserStore();
    store.navigate("a/");
    store.navigate("a/b/");

    store.goBack();
    expect(store.getState().currentPath).toBe("a/");

    store.goForward();
    expect(store.getState().currentPath).toBe("a/b/");
  });

  it("test_goUp_navigates_to_parent", () => {
    const store = createBrowserStore({ currentPath: "a/b/c/", history: ["a/b/c/"], historyIndex: 0 });

    store.goUp();

    expect(store.getState().currentPath).toBe("a/b/");
  });

  it("test_selection_methods", () => {
    const items: BrowserItem[] = [
      { kind: "file", key: "a.txt", name: "a.txt", size: 1, lastModified: new Date(), contentType: "text/plain" },
      { kind: "file", key: "b.txt", name: "b.txt", size: 1, lastModified: new Date(), contentType: "text/plain" },
      { kind: "file", key: "c.txt", name: "c.txt", size: 1, lastModified: new Date(), contentType: "text/plain" },
    ];

    const store = createBrowserStore({ items });

    store.select("a.txt");
    expect(store.getState().selectedKeys.has("a.txt")).toBe(true);

    store.toggleSelect("a.txt");
    expect(store.getState().selectedKeys.has("a.txt")).toBe(false);

    store.selectAll();
    expect(store.getState().selectedKeys.size).toBe(3);

    store.selectRange("a.txt", "c.txt");
    expect(store.getState().selectedKeys.size).toBe(3);

    store.deselectAll();
    expect(store.getState().selectedKeys.size).toBe(0);
  });

  it("test_setSort_toggles_direction", () => {
    const store = createBrowserStore();

    store.setSort("name");
    expect(store.getState().sort).toEqual({ field: "name", direction: "desc" });

    store.setSort("name");
    expect(store.getState().sort).toEqual({ field: "name", direction: "asc" });
  });

  it("test_getSortedItems_folders_first_and_search", () => {
    const store = createBrowserStore({
      items: [
        { kind: "file", key: "b.txt", name: "b.txt", size: 2, lastModified: new Date("2026-01-02"), contentType: "text/plain" },
        { kind: "folder", key: "a/", name: "a" },
        { kind: "file", key: "photo.jpg", name: "photo.jpg", size: 1, lastModified: new Date("2026-01-01"), contentType: "image/jpeg" },
      ],
    });

    store.setSearchQuery("photo");
    const sorted = store.getSortedItems();

    expect(sorted).toHaveLength(1);
    expect(sorted[0]?.name).toBe("photo.jpg");
  });

  it("test_subscribe_notify_and_unsubscribe", () => {
    const store = createBrowserStore();
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.setLoading(true);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    store.setLoading(false);
    expect(listener).toHaveBeenCalledOnce();
  });
});
