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
  uploadDropzoneAppearance,
} from "~/lib/upload-styles";
import { UploadDropzone } from "~/utils/upload";

export default function DropzoneDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dropzone</h1>
        <p className="mt-2 text-muted-foreground">
          The{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            UploadDropzone
          </code>{" "}
          component provides a drag-and-drop area with image previews and a
          progress bar.
        </p>
      </div>

      {/* Auto Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Auto Mode — Image Upload</CardTitle>
            <Badge variant="secondary">imageUploader</Badge>
          </div>
          <CardDescription>
            Drag images into the zone or click to browse. Upload starts
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            endpoint="imageUploader"
            appearance={uploadDropzoneAppearance}
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} image(s)`, {
                description: "Images uploaded successfully to S3.",
              });
            }}
            onUploadError={(error: Error) => {
              toast.error("Upload failed", {
                description: error.message,
              });
            }}
            onUploadProgress={(progress: number) => {
              console.log("Dropzone progress:", progress);
            }}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              image/*
            </Badge>
            <Badge variant="outline" className="text-xs">
              4 MB max
            </Badge>
            <Badge variant="outline" className="text-xs">
              4 files
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Manual Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manual Mode — Any File</CardTitle>
            <Badge variant="secondary">mode=&quot;manual&quot;</Badge>
          </div>
          <CardDescription>
            Drop or select files to stage them, then click &quot;Upload&quot; to
            send. Uses the anyFileUploader endpoint (up to 10 files).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            endpoint="anyFileUploader"
            mode="manual"
            appearance={uploadDropzoneAppearance}
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} file(s)`, {
                description: "Files uploaded via manual mode.",
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

      {/* Paste Support */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>With Paste Support</CardTitle>
            <Badge variant="secondary">onPaste</Badge>
          </div>
          <CardDescription>
            Paste images from your clipboard (Ctrl/Cmd+V) anywhere on the page.
            The onPaste prop enables this behavior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            endpoint="imageUploader"
            onPaste
            appearance={uploadDropzoneAppearance}
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(
                `Pasted & uploaded ${String(res.length)} file(s)`,
                {
                  description: "Clipboard images uploaded successfully.",
                },
              );
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
