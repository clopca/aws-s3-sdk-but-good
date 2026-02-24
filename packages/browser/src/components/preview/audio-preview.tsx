import type { PreviewRendererProps } from "./index";

export default function AudioPreview({ url, fileName }: PreviewRendererProps) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
      <div className="text-sm font-medium text-foreground">{fileName}</div>
      <audio src={url} controls className="w-full" />
    </div>
  );
}
