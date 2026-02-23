"use client";

import { S3Browser } from "@s3-good/browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export default function BrowserPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">S3 Browser</h1>
        <p className="mt-2 text-muted-foreground">
          Browse, preview, download, and manage files in your S3 bucket.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>File Browser</CardTitle>
            <Badge variant="secondary">@s3-good/browser</Badge>
          </div>
          <CardDescription>
            A full-featured file browser component with folder navigation,
            file previews, and download support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <S3Browser url="/api/browser" />
        </CardContent>
      </Card>
    </div>
  );
}
