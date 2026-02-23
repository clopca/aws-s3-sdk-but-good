import type { PreviewRendererProps } from "./index";

export default function PdfPreview({ url, fileName }: PreviewRendererProps) {
  return (
    <div className="h-[80vh] w-full overflow-hidden rounded-lg border border-slate-300 bg-white">
      <iframe src={url} title={fileName} className="h-full w-full" />
    </div>
  );
}
