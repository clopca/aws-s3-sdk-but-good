import { useEffect, useMemo, useState } from "react";
import { getCodeLanguage } from "@s3-good/shared";
import type { PreviewRendererProps } from "./index";

export default function CodePreview({ url, fileName }: PreviewRendererProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    void fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (!active) return;
        setContent(text);
      })
      .catch(() => {
        if (!active) return;
        setContent("Failed to load file preview");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  const language = useMemo(() => getCodeLanguage(fileName), [fileName]);

  if (loading) {
    return <div className="h-[60vh] w-[70vw] animate-pulse rounded-lg bg-slate-800" />;
  }

  return (
    <div className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg bg-slate-900 p-4 text-slate-100">
      <div className="mb-2 text-xs uppercase text-slate-400">{language}</div>
      <pre className="text-sm"><code>{content}</code></pre>
    </div>
  );
}
