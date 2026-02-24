import { useEffect, useMemo, useState } from "react";
import type { PreviewRendererProps } from "./index";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const flushCell = () => {
    row.push(cell.trim());
    cell = "";
  };

  const flushRow = () => {
    const hasContent = row.some((value) => value.length > 0);
    if (hasContent) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\"") {
      const nextChar = text[index + 1];
      if (inQuotes && nextChar === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      flushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      flushCell();
      flushRow();
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    flushCell();
    flushRow();
  }

  return rows;
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
    return <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No rows</div>;
  }

  const [header, ...body] = rows;

  return (
    <div className="max-h-[80vh] w-[80vw] overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>{header?.map((cell, index) => <th key={index} className="px-3 py-2 font-semibold">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
