import { createElement, type CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Theming Types ──────────────────────────────────────────────────────────

/**
 * A style value can be:
 * - A CSS class name string (replaces default inline styles)
 * - A CSSProperties object (merged with default styles)
 * - A function receiving content options that returns a string or CSSProperties
 *
 * @example
 * ```tsx
 * // Class name — default inline styles are removed
 * appearance={{ button: "my-btn" }}
 *
 * // Inline styles — merged with defaults
 * appearance={{ button: { backgroundColor: "red" } }}
 *
 * // Dynamic function — merged with defaults
 * appearance={{ container: (opts) => opts.isDragOver ? { borderColor: "green" } : {} }}
 * ```
 */
export type StyleField<TContentOpts> =
  | string
  | CSSProperties
  | ((opts: TContentOpts) => string | CSSProperties);

/**
 * Resolves a style field to a CSSProperties object (or undefined when a
 * class name is used instead).
 *
 * Resolution rules:
 * - `undefined` → returns `defaultStyle` as-is
 * - `string` → returns `undefined` (inline styles are skipped; className applied separately)
 * - `CSSProperties` → merged on top of `defaultStyle`
 * - `function` → called with `opts`; if result is a string, returns `undefined`;
 *   if result is CSSProperties, merged on top of `defaultStyle`
 */
export function resolveStyle<TContentOpts>(
  field: StyleField<TContentOpts> | undefined,
  opts: TContentOpts,
  defaultStyle?: CSSProperties,
): CSSProperties | undefined {
  if (field === undefined) return defaultStyle;

  if (typeof field === "string") {
    // String = CSS class name — skip inline styles
    return undefined;
  }

  if (typeof field === "function") {
    const result = field(opts);
    if (typeof result === "string") return undefined;
    return defaultStyle ? { ...defaultStyle, ...result } : result;
  }

  // CSSProperties object — merge with defaults
  return defaultStyle ? { ...defaultStyle, ...field } : field;
}

/**
 * Resolves a style field to a className string.
 *
 * Returns the string value when the field is a string or when a function
 * returns a string. Returns `undefined` for CSSProperties values.
 */
export function resolveClassName<TContentOpts>(
  field: StyleField<TContentOpts> | undefined,
  opts?: TContentOpts,
): string | undefined {
  if (field === undefined) return undefined;
  if (typeof field === "string") return field;
  if (typeof field === "function" && opts !== undefined) {
    const result = field(opts);
    if (typeof result === "string") return result;
  }
  return undefined;
}

/**
 * Merges class names with Tailwind conflict resolution.
 * Uses clsx for conditional class joining and tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string | undefined {
  const className = twMerge(clsx(inputs));
  return className || undefined;
}

/**
 * Renders content that can be a static ReactNode or a function that receives
 * content options and returns a ReactNode.
 */
export function renderContent<TContentOpts>(
  content:
    | React.ReactNode
    | ((opts: TContentOpts) => React.ReactNode)
    | undefined,
  opts: TContentOpts,
  defaultContent: React.ReactNode,
): React.ReactNode {
  if (content === undefined) return defaultContent;
  if (typeof content === "function") return content(opts);
  return content;
}

// ─── Shared Components ──────────────────────────────────────────────────────

/**
 * SVG upload icon used as the default icon in UploadDropzone.
 * Uses `createElement` to avoid requiring JSX in a `.ts` file.
 */
export function UploadIcon() {
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 40,
      height: 40,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    createElement("path", {
      d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
    }),
    createElement("polyline", { points: "17 8 12 3 7 8" }),
    createElement("line", { x1: 12, y1: 3, x2: 12, y2: 15 }),
  );
}

// ─── Accept String Generation ───────────────────────────────────────────────

/**
 * Maps high-level file type categories to MIME patterns for the HTML
 * `<input accept>` attribute.
 */
const FILE_TYPE_TO_ACCEPT: Record<string, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  pdf: "application/pdf",
  text: "text/*",
  blob: "*/*",
};

/**
 * Generates an accept string for an HTML file input from an array of
 * high-level file type categories (e.g. ["image", "pdf"] → "image/*,application/pdf").
 */
export function generateAcceptString(fileTypes: string[]): string {
  return fileTypes.map((type) => FILE_TYPE_TO_ACCEPT[type] ?? type).join(",");
}

// ─── Allowed Content Text ───────────────────────────────────────────────────

/**
 * Generates default "allowed content" display text from permitted file types.
 * E.g. ["image", "pdf"] → "image, pdf"
 */
export function generateAllowedContentText(fileTypes: string[]): string {
  if (fileTypes.length === 0) return "";
  return fileTypes.join(", ");
}
