"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useUpload } from "~/utils/upload";

export default function CustomHookPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Array<{ url: string; name: string }>>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading, progress, abort } = useUpload(
    "imageUploader",
    {
      onClientUploadComplete: (res: Array<{ url: string; name: string }>) => {
        setResults(
          res.map((r: { url: string; name: string }) => ({
            url: r.url,
            name: r.name,
          })),
        );
        setFiles([]);
        toast.success(`Uploaded ${String(res.length)} file(s)`, {
          description: "Custom hook upload completed.",
        });
      },
      onUploadError: (error: Error) => {
        toast.error("Upload failed", {
          description: error.message,
        });
      },
      onUploadProgress: (p: number) => {
        console.log("Hook progress:", p);
      },
    },
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
    setResults([]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    await startUpload(files);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custom Hook</h1>
        <p className="mt-2 text-muted-foreground">
          Use the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            useUpload
          </code>{" "}
          hook to build a completely custom upload UI. You get full control over
          file selection, progress display, and abort functionality.
        </p>
      </div>

      {/* Upload UI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Upload UI</CardTitle>
            <Badge variant="secondary">useUpload</Badge>
          </div>
          <CardDescription>
            Select files, track progress, and abort uploads — all with a custom
            interface built using the hook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Select Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {files.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {files.length} file(s) selected
              </span>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <ul className="space-y-1">
                {files.map((f) => (
                  <li
                    key={`${f.name}-${String(f.size)}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? `Uploading... ${String(progress)}%` : "Upload"}
            </Button>
            {isUploading && (
              <Button variant="destructive" onClick={abort}>
                Abort
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-[width] duration-150 ease-linear"
                style={{ width: `${String(progress)}%` }}
              />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-semibold">Upload Results</h3>
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.url} className="text-sm">
                    <span className="font-medium">{r.name}</span>
                    <code className="ml-2 rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs text-muted-foreground">
                      {r.url}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            The hook returns everything you need to build a custom upload
            experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-lg bg-zinc-950 p-4 font-[family-name:var(--font-geist-mono)] text-[13px] leading-6 text-zinc-100">
            {`const { startUpload, isUploading, progress, abort } =
  useUpload("imageUploader", {
    onClientUploadComplete: (res) => {
      // handle results
    },
    onUploadError: (err) => {
      // handle error
    },
    onUploadProgress: (p) => {
      // 0-100
    },
  });

// Start upload with selected files
await startUpload(files);

// Abort in-progress upload
abort();`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
