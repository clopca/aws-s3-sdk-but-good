"use client";

import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { UploadButton, UploadDropzone } from "~/utils/upload";

export default function ThemedPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Themed Components
        </h1>
        <p className="mt-2 text-muted-foreground">
          Customize the look and feel of{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            UploadButton
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            UploadDropzone
          </code>{" "}
          using the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            appearance
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            content
          </code>{" "}
          props.
        </p>
      </div>

      {/* Themed Variants Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Custom Styled Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Custom Styled</CardTitle>
              <Badge variant="secondary">appearance</Badge>
            </div>
            <CardDescription>
              Override default styles with the appearance prop. Style values can
              be static objects or functions of component state.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <UploadButton
              endpoint="imageUploader"
              appearance={{
                button: ({
                  ready,
                  isUploading,
                }: {
                  ready: boolean;
                  isUploading: boolean;
                }) => ({
                  padding: "10px 24px",
                  borderRadius: 20,
                  border: "none",
                  backgroundColor: isUploading
                    ? "#f59e0b"
                    : ready
                      ? "#10b981"
                      : "#d1d5db",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: ready ? "pointer" : "not-allowed",
                  transition: "background-color 200ms ease",
                }),
                container: {
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 8,
                },
                allowedContent: {
                  color: "#9ca3af",
                  fontSize: 12,
                },
              }}
              content={{
                button: ({
                  isUploading,
                  uploadProgress,
                }: {
                  isUploading: boolean;
                  uploadProgress: number;
                }) =>
                  isUploading
                    ? `Sending... ${String(uploadProgress)}%`
                    : "Pick Images",
                allowedContent: () => "Images only, up to 4MB",
              }}
              onClientUploadComplete={(res: unknown[]) => {
                toast.success(`Uploaded ${String(res.length)} file(s)`, {
                  description: "Custom styled upload completed.",
                });
              }}
              onUploadError={(error: Error) => {
                toast.error("Upload failed", {
                  description: error.message,
                });
              }}
            />
          </CardContent>
        </Card>

        {/* Minimal Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Minimal</CardTitle>
              <Badge variant="secondary">text-link</Badge>
            </div>
            <CardDescription>
              Strip down to a minimal text-link style. Perfect for inline upload
              triggers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <UploadButton
              endpoint="imageUploader"
              appearance={{
                button: {
                  background: "none",
                  border: "none",
                  color: "#0070f3",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 0,
                },
                container: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                },
                allowedContent: {
                  display: "none",
                },
              }}
              content={{
                button: ({
                  isUploading,
                  uploadProgress,
                }: {
                  isUploading: boolean;
                  uploadProgress: number;
                }) =>
                  isUploading
                    ? `Uploading ${String(uploadProgress)}%...`
                    : "Upload an image",
              }}
              onClientUploadComplete={(res: unknown[]) => {
                toast.success(`Uploaded ${String(res.length)} file(s)`, {
                  description: "Minimal style upload completed.",
                });
              }}
              onUploadError={(error: Error) => {
                toast.error("Upload failed", {
                  description: error.message,
                });
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dark Dropzone — Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dark Dropzone</CardTitle>
            <Badge variant="secondary">dark theme</Badge>
          </div>
          <CardDescription>
            A dark-themed dropzone with custom content and styles. Demonstrates
            dynamic styling based on drag state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            endpoint="anyFileUploader"
            appearance={{
              container: ({
                isDragOver,
              }: {
                isDragOver: boolean;
              }) => ({
                padding: 32,
                border: `2px dashed ${isDragOver ? "#818cf8" : "#4b5563"}`,
                borderRadius: 12,
                backgroundColor: isDragOver ? "#1e1b4b" : "#111827",
                cursor: "pointer",
                transition: "all 200ms ease",
              }),
              uploadIcon: {
                color: "#6b7280",
              },
              label: {
                color: "#e5e7eb",
                fontSize: 15,
              },
              allowedContent: {
                color: "#6b7280",
                fontSize: 12,
              },
              button: {
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                backgroundColor: "#6366f1",
                color: "#fff",
                fontWeight: 500,
                cursor: "pointer",
              },
            }}
            content={{
              label: ({
                isDragOver,
                isUploading,
                uploadProgress,
              }: {
                isDragOver: boolean;
                isUploading: boolean;
                uploadProgress: number;
              }) => {
                if (isUploading)
                  return `Uploading... ${String(uploadProgress)}%`;
                if (isDragOver) return "Release to upload";
                return "Drop files here or click to browse";
              },
              allowedContent: () =>
                "Any file type, up to 32MB each (10 max)",
            }}
            mode="manual"
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} file(s)`, {
                description: "Dark theme upload completed.",
              });
            }}
            onUploadError={(error: Error) => {
              toast.error("Upload failed", {
                description: error.message,
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
