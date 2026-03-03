import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { BrowserFile, BrowserItem } from "s3-good/types";
import { getPreviewType } from "s3-good/types";
import type { BrowserClient } from "../client";
import type { BrowserStore } from "../state";

export function useFilePreview(
  store: BrowserStore,
  client: BrowserClient,
  activeBucket?: string,
) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const openPreview = useCallback(
    async (item: BrowserItem) => {
      if (item.kind !== "file") return;

      store.setPreviewItem(item);
      setIsLoadingPreview(true);

      try {
        const url = await client.getPreviewUrl(item.key, activeBucket);
        setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [activeBucket, client, store],
  );

  const closePreview = useCallback(() => {
    store.setPreviewItem(null);
    setPreviewUrl(null);
  }, [store]);

  const navigatePreview = useCallback(
    async (direction: "prev" | "next") => {
      const state = store.getState();
      const files = state.items.filter(
        (item): item is BrowserFile => item.kind === "file",
      );
      const currentKey = state.previewItem?.key;
      const currentIndex = files.findIndex((file) => file.key === currentKey);

      if (currentIndex < 0) return;

      const nextIndex =
        direction === "prev" ? currentIndex - 1 : currentIndex + 1;
      const nextFile = files[nextIndex];
      if (!nextFile) return;

      await openPreview(nextFile);
    },
    [openPreview, store],
  );

  const previewItem = state.previewItem;
  const previewType = useMemo(
    () =>
      previewItem && previewItem.kind === "file"
        ? getPreviewType(previewItem.contentType, previewItem.name)
        : null,
    [previewItem],
  );

  return useMemo(
    () => ({
      previewItem,
      previewUrl,
      isLoadingPreview,
      previewType,
      openPreview,
      closePreview,
      navigatePreview,
    }),
    [
      previewItem,
      previewUrl,
      isLoadingPreview,
      previewType,
      openPreview,
      closePreview,
      navigatePreview,
    ],
  );
}
