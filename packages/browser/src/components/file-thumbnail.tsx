import { useState, useEffect, useRef } from "react";
import type { BrowserItem } from "@s3-good-internal/shared";
import { getPreviewType } from "@s3-good-internal/shared";
import { FileIcon, FolderIcon } from "./file-icon";

export interface FileThumbnailProps {
  item: BrowserItem;
  size: number;
  getPreviewUrl?: (key: string) => Promise<string>;
}

export function FileThumbnail({ item, size, getPreviewUrl }: FileThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const previewType = item.kind === "file" ? getPreviewType(item.contentType, item.name) : null;
  const isImage = previewType === "image";

  useEffect(() => {
    if (!isImage || !getPreviewUrl || error || loadedRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // Fallback: load immediately when IntersectionObserver is unavailable
      loadedRef.current = true;
      getPreviewUrl(item.key)
        .then(setThumbnailUrl)
        .catch(() => setError(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          loadedRef.current = true;
          getPreviewUrl(item.key)
            .then(setThumbnailUrl)
            .catch(() => setError(true));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isImage, getPreviewUrl, item.key, error]);

  if (item.kind === "folder") {
    return <FolderIcon size={size} />;
  }

  if (isImage && thumbnailUrl && !error) {
    return (
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <img
          src={thumbnailUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={() => {
            setError(true);
          }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <FileIcon type={previewType ?? "unknown"} size={size} />
    </div>
  );
}
