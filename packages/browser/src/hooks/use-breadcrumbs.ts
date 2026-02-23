import { useMemo } from "react";

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

export function useBreadcrumbs(currentPath: string, rootPrefix?: string): BreadcrumbSegment[] {
  return useMemo(() => {
    const root = rootPrefix ?? "";
    const segments: BreadcrumbSegment[] = [{ label: "Root", path: root }];

    const relativePath = rootPrefix && currentPath.startsWith(rootPrefix)
      ? currentPath.slice(rootPrefix.length)
      : currentPath;

    const parts = relativePath.split("/").filter(Boolean);
    let accumulated = root;

    parts.forEach((part) => {
      accumulated += `${part}/`;
      segments.push({ label: part, path: accumulated });
    });

    return segments;
  }, [currentPath, rootPrefix]);
}
