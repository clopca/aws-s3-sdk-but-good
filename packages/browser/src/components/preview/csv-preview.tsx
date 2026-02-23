import { useEffect, useMemo, useState } from "react";
import type { PreviewRendererProps } from "./index";

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((value) => value.trim()));
}

export default function CsvPreview({ url }: PreviewRendererProps) {
  const [raw, setRaw] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (!active) return;
        setRaw(text);
      })
      .catch(() => {
        if (!active) return;
        setRaw("error");
      });

    return () => {
      active = false;
    };
  }, [url]);

  const rows = useMemo(() => parseCsv(raw), [raw]);

  if (rows.length === 0) {
    return <div className="rounded-lg bg-white p-4 text-sm text-slate-500">No rows</div>;
  }

  const [header, ...body] = rows;

  return (
    <div className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-100">
          <tr>{header?.map((cell, index) => <th key={index} className="px-3 py-2 font-semibold">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
