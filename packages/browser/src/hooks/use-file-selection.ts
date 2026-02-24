import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { BrowserStore } from "../state";

export interface SelectionClickEvent {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function useFileSelection(store: BrowserStore) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  const handleClick = useCallback(
    (key: string, event: SelectionClickEvent) => {
      const currentState = store.getState();

      if (event.shiftKey && currentState.selectedKeys.size > 0) {
        const lastSelected = Array.from(currentState.selectedKeys).pop();
        if (lastSelected) {
          store.selectRange(lastSelected, key);
          return;
        }
      }

      if (event.ctrlKey || event.metaKey) {
        store.toggleSelect(key);
        return;
      }

      store.deselectAll();
      store.select(key);
    },
    [store],
  );

  const isSelected = useCallback(
    (key: string): boolean => state.selectedKeys.has(key),
    [state.selectedKeys],
  );

  return useMemo(
    () => ({
      selectedKeys: state.selectedKeys,
      selectedCount: state.selectedKeys.size,
      isSelected,
      handleClick,
      selectAll: store.selectAll,
      deselectAll: store.deselectAll,
    }),
    [
      state.selectedKeys,
      isSelected,
      handleClick,
      store.selectAll,
      store.deselectAll,
    ],
  );
}
