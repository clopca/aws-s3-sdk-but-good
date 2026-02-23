"use client";

import { UploadButton, UploadDropzone } from "~/utils/upload";

/**
 * Themed Demo — customize the appearance and content of built-in components.
 *
 * Demonstrates:
 * - `appearance` prop for custom styles (inline or className-based)
 * - `content` prop for custom labels and icons
 * - Style functions that receive component state (ready, uploading, etc.)
 */
export default function ThemedPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Themed Components</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Customize the look and feel of <code>UploadButton</code> and{" "}
        <code>UploadDropzone</code> using the <code>appearance</code> and{" "}
        <code>content</code> props.
      </p>

      {/* ── Custom styled button ─────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          Custom Styled Button
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Override default styles with the <code>appearance</code> prop.
          Style values can be static objects or functions of component state.
        </p>
        <UploadButton
          endpoint="imageUploader"
          appearance={{
            button: ({ ready, isUploading }) => ({
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
            button: ({ isUploading, uploadProgress }) =>
              isUploading
                ? `Sending... ${String(uploadProgress)}%`
                : "Pick Images",
            allowedContent: () => "Images only, up to 4MB",
          }}
          onClientUploadComplete={(res) => {
            alert(`Themed upload: ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Error: ${error.message}`);
          }}
        />
      </section>

      {/* ── Dark dropzone ────────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Dark Dropzone</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          A dark-themed dropzone with custom content and styles.
        </p>
        <UploadDropzone
          endpoint="anyFileUploader"
          appearance={{
            container: ({ isDragOver }) => ({
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
            label: ({ isDragOver, isUploading, uploadProgress }) => {
              if (isUploading) return `Uploading... ${String(uploadProgress)}%`;
              if (isDragOver) return "Release to upload";
              return "Drop files here or click to browse";
            },
            allowedContent: () => "Any file type, up to 32MB each (10 max)",
          }}
          mode="manual"
          onClientUploadComplete={(res) => {
            alert(`Dark theme upload: ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Error: ${error.message}`);
          }}
        />
      </section>

      {/* ── Minimal button ───────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Minimal Button</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Strip down to a minimal text-link style.
        </p>
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
            button: ({ isUploading, uploadProgress }) =>
              isUploading
                ? `Uploading ${String(uploadProgress)}%...`
                : "Upload an image",
          }}
          onClientUploadComplete={(res) => {
            alert(`Minimal upload: ${String(res.length)} file(s)!`);
          }}
          onUploadError={(error) => {
            alert(`Error: ${error.message}`);
          }}
        />
      </section>
    </div>
  );
}
