import type { PreviewRendererProps } from "./index";

export default function AudioPreview({ url, fileName }: PreviewRendererProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-medium text-slate-700">{fileName}</div>
      <audio src={url} controls className="w-full" />
    </div>
  );
}
