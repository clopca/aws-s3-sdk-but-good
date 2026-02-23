import type { PreviewRendererProps } from "./index";

export default function ImagePreview({ url, fileName }: PreviewRendererProps) {
  return <img src={url} alt={fileName} className="max-h-[80vh] max-w-full rounded-lg object-contain" />;
}
