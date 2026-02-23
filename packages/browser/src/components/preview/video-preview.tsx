import type { PreviewRendererProps } from "./index";

export default function VideoPreview({ url }: PreviewRendererProps) {
  return <video src={url} controls className="max-h-[80vh] max-w-full rounded-lg" />;
}
