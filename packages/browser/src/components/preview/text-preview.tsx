import { useEffect, useState } from "react";
import type { PreviewRendererProps } from "./index";

export default function TextPreview({ url }: PreviewRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      setContent("Text preview is unavailable in this environment");
      return () => {
        active = false;
      };
    }

    const request = fetchImpl(url, { signal: controller.signal });
    if (!request || typeof request.then !== "function") {
      setContent("Text preview is unavailable in this environment");
      return () => {
        active = false;
      };
    }

    void request
      .then((response) => response.text())
      .then((text) => {
        if (!active) return;
        setContent(text);
      })
      .catch(() => {
        if (!active) return;
        setContent("Failed to load text preview");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url]);

  return (
    <pre className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg border border-border bg-card p-4 text-sm text-card-foreground">
      {content}
    </pre>
  );
}
