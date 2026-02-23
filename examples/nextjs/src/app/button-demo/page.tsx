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
import { UploadButton } from "~/utils/upload";

export default function ButtonDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Button</h1>
        <p className="mt-2 text-muted-foreground">
          The <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">UploadButton</code> component
          provides a simple file picker button. It supports auto and manual
          upload modes.
        </p>
      </div>

      {/* Auto Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Auto Mode</CardTitle>
            <Badge variant="secondary">Default</Badge>
          </div>
          <CardDescription>
            Files upload immediately after selection. No extra click needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <UploadButton
            endpoint="imageUploader"
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} file(s)`, {
                description: "Files uploaded successfully to S3.",
              });
            }}
            onUploadError={(error: Error) => {
              toast.error("Upload failed", {
                description: error.message,
              });
            }}
            onUploadProgress={(progress: number) => {
              console.log("Progress:", progress);
            }}
          />
          <div className="flex gap-2">
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
            <CardTitle>Manual Mode</CardTitle>
            <Badge variant="secondary">mode=&quot;manual&quot;</Badge>
          </div>
          <CardDescription>
            Files are selected first, then uploaded when the user clicks
            &quot;Upload&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <UploadButton
            endpoint="imageUploader"
            mode="manual"
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} file(s)`, {
                description: "Manual upload completed.",
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

      {/* Different Endpoint */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Any File Endpoint</CardTitle>
            <Badge variant="secondary">anyFileUploader</Badge>
          </div>
          <CardDescription>
            Same component, different endpoint — accepts any file type up to
            32 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <UploadButton
            endpoint="anyFileUploader"
            onClientUploadComplete={(res: unknown[]) => {
              toast.success(`Uploaded ${String(res.length)} file(s)`, {
                description: "Files uploaded via anyFileUploader.",
              });
            }}
            onUploadError={(error: Error) => {
              toast.error("Upload failed", {
                description: error.message,
              });
            }}
          />
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              blob/*
            </Badge>
            <Badge variant="outline" className="text-xs">
              32 MB max
            </Badge>
            <Badge variant="outline" className="text-xs">
              10 files
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
