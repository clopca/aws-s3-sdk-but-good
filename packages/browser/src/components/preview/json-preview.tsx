import { useEffect, useState } from "react";
import type { PreviewRendererProps } from "./index";

export default function JsonPreview({ url }: PreviewRendererProps) {
  const [content, setContent] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    void fetch(url)
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        setContent(json);
      })
      .catch(() => {
        if (!active) return;
        setContent({ error: "Failed to load JSON preview" });
      });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <pre className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}
