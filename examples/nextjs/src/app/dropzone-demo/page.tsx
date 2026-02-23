"use client";

import { UploadDropzone } from "~/utils/upload";

/**
 * Dropzone Demo — demonstrates UploadDropzone with drag & drop,
 * image previews, and progress tracking.
 *
 * - **Auto mode**: files upload on drop or selection.
 * - **Manual mode**: files are staged, then uploaded on button click.
 */
export default function DropzoneDemoPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>UploadDropzone Demo</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        The <code>UploadDropzone</code> component provides a drag-and-drop
        area with image previews and a progress bar.
      </p>

      {/* ── Auto mode ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          Auto Mode — Image Upload
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Drag images into the zone or click to browse. Upload starts
          immediately.
        </p>
        <UploadDropzone
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            console.log("Dropzone upload complete:", res);
            alert(`Uploaded ${String(res.length)} image(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Upload failed: ${error.message}`);
          }}
          onUploadProgress={(progress) => {
            console.log("Dropzone progress:", progress);
          }}
        />
      </section>

      {/* ── Manual mode ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          Manual Mode — Any File
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Drop or select files to stage them, then click &quot;Upload&quot; to
          send. Uses the <code>anyFileUploader</code> endpoint (up to 10
          files).
        </p>
        <UploadDropzone
          endpoint="anyFileUploader"
          mode="manual"
          onClientUploadComplete={(res) => {
            alert(`Uploaded ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Upload failed: ${error.message}`);
          }}
        />
      </section>

      {/* ── With paste support ────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          With Paste Support
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Paste images from your clipboard (Ctrl/Cmd+V) anywhere on the page.
          The <code>onPaste</code> prop enables this behavior.
        </p>
        <UploadDropzone
          endpoint="imageUploader"
          onPaste
          onClientUploadComplete={(res) => {
            alert(`Pasted & uploaded ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Upload failed: ${error.message}`);
          }}
        />
      </section>
    </div>
  );
}
