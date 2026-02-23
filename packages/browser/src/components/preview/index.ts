import { lazy } from "react";
import type { PreviewType } from "@s3-good/shared";

export interface PreviewRendererProps {
  url: string;
  fileName: string;
  contentType: string;
}

const ImagePreview = lazy(() => import("./image-preview"));
const PdfPreview = lazy(() => import("./pdf-preview"));
const CodePreview = lazy(() => import("./code-preview"));
const JsonPreview = lazy(() => import("./json-preview"));
const CsvPreview = lazy(() => import("./csv-preview"));
const VideoPreview = lazy(() => import("./video-preview"));
const AudioPreview = lazy(() => import("./audio-preview"));
const TextPreview = lazy(() => import("./text-preview"));

export function getPreviewComponent(type: PreviewType) {
  switch (type) {
    case "image":
      return ImagePreview;
    case "pdf":
      return PdfPreview;
    case "code":
      return CodePreview;
    case "json":
      return JsonPreview;
    case "csv":
      return CsvPreview;
    case "video":
      return VideoPreview;
    case "audio":
      return AudioPreview;
    case "text":
      return TextPreview;
    default:
      return null;
  }
}
