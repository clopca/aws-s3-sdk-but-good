"use client";

import { UploadButton } from "~/utils/upload";

/**
 * Button Demo — demonstrates UploadButton in both auto and manual modes.
 *
 * - **Auto mode** (default): upload starts immediately after file selection.
 * - **Manual mode**: files are selected first, then uploaded on button click.
 */
export default function ButtonDemoPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>UploadButton Demo</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        The <code>UploadButton</code> component provides a simple file picker
        button. It supports auto and manual upload modes.
      </p>

      {/* ── Auto mode (default) ──────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          Auto Mode (default)
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Files upload immediately after selection. No extra click needed.
        </p>
        <UploadButton
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            console.log("Upload complete:", res);
            alert(`Uploaded ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            console.error("Upload error:", error);
            alert(`Upload failed: ${error.message}`);
          }}
          onUploadProgress={(progress) => {
            console.log("Progress:", progress);
          }}
        />
      </section>

      {/* ── Manual mode ──────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Manual Mode</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Files are selected first, then uploaded when the user clicks
          &quot;Upload&quot;.
        </p>
        <UploadButton
          endpoint="imageUploader"
          mode="manual"
          onClientUploadComplete={(res) => {
            console.log("Manual upload complete:", res);
            alert(`Uploaded ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Upload failed: ${error.message}`);
          }}
        />
      </section>

      {/* ── Different endpoint ────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          Different Endpoint (anyFileUploader)
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Same component, different endpoint — accepts any file type.
        </p>
        <UploadButton
          endpoint="anyFileUploader"
          onClientUploadComplete={(res) => {
            alert(`Uploaded ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Upload failed: ${error.message}`);
          }}
        />
      </section>
    </div>
  );
}
