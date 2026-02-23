import type { PreviewType } from "@s3-good/shared";

interface FileIconProps {
  type: PreviewType;
  className?: string;
  size?: number;
}

interface FolderIconProps {
  className?: string;
  size?: number;
}

function baseProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    xmlns: "http://www.w3.org/2000/svg",
  };
}

export function FolderIcon({ className = "text-amber-500", size = 24 }: FolderIconProps) {
  return (
    <svg {...baseProps(size, className)} aria-hidden="true">
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2H18.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-10Z" fill="currentColor" />
    </svg>
  );
}

export function FileIcon({ type, className, size = 24 }: FileIconProps) {
  const colors: Record<PreviewType, string> = {
    image: "text-emerald-500",
    video: "text-rose-500",
    audio: "text-orange-500",
    pdf: "text-red-600",
    code: "text-indigo-500",
    json: "text-violet-500",
    csv: "text-lime-600",
    text: "text-slate-500",
    unknown: "text-slate-400",
  };

  const iconClass = `${colors[type]} ${className ?? ""}`.trim();

  if (type === "image") {
    return (
      <svg {...baseProps(size, iconClass)} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path d="m6 18 4.5-4 3 2.5L18 12l3 6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "video") {
    return (
      <svg {...baseProps(size, iconClass)} aria-hidden="true">
        <rect x="3" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="m17 10 4-2v8l-4-2v-4Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "audio") {
    return (
      <svg {...baseProps(size, iconClass)} aria-hidden="true">
        <path d="M13 5v10.5a2.5 2.5 0 1 1-1.5-2.29V8h7V5h-5.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (type === "pdf") {
    return (
      <svg {...baseProps(size, iconClass)} aria-hidden="true">
        <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" />
        <text x="12" y="17" textAnchor="middle" fontSize="6" fill="currentColor">PDF</text>
      </svg>
    );
  }

  return (
    <svg {...baseProps(size, iconClass)} aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 14h6M9 17h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
