import { useEffect, useState } from "react";
import type { PreviewRendererProps } from "./index";

export default function TextPreview({ url }: PreviewRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    let active = true;

    void fetch(url)
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
    };
  }, [url]);

  return (
    <pre className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
      {content}
    </pre>
  );
}
