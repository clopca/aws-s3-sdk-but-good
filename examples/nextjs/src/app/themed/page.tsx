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
import {
  greenButtonAppearance,
  minimalButtonAppearance,
  darkDropzoneAppearance,
} from "~/lib/upload-styles";
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
        {/* Green / Emerald Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Emerald Theme</CardTitle>
              <Badge variant="secondary">appearance</Badge>
            </div>
            <CardDescription>
              A nature-inspired pill button with emerald colors. Demonstrates
              className-based theming via the appearance prop.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <UploadButton
              endpoint="imageUploader"
              appearance={greenButtonAppearance}
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
                  description: "Emerald theme upload completed.",
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
              appearance={minimalButtonAppearance}
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
            A dark-themed dropzone with custom content and styles. Uses Tailwind
            classes with zinc and indigo colors for a sleek dark appearance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            endpoint="anyFileUploader"
            appearance={darkDropzoneAppearance}
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
