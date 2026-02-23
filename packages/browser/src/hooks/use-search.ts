import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BrowserStore } from "../state";

export function useSearch(store: BrowserStore, debounceMs = 300) {
  const searchQuery = useSyncExternalStore(store.subscribe, store.getState, store.getState).searchQuery;
  const [inputValue, setInputValue] = useState(searchQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback((value: string) => {
    setInputValue(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      store.setSearchQuery(value);
    }, debounceMs);
  }, [debounceMs, store]);

  const clear = useCallback(() => {
    handleChange("");
  }, [handleChange]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    searchQuery,
    inputValue,
    handleChange,
    clear,
  };
}
