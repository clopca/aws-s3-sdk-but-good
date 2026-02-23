"use client";

import { useRef, useState } from "react";
import { useUpload } from "~/utils/upload";

/**
 * Custom Hook Demo — build a fully custom upload UI with useUpload.
 *
 * This page shows how to use the hook directly for maximum control
 * over the upload experience: custom file input, progress display,
 * abort functionality, and result handling.
 */
export default function CustomHookPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Array<{ url: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading, progress, abort } = useUpload(
    "imageUploader",
    {
      onClientUploadComplete: (res) => {
        console.log("Hook upload complete:", res);
        setResults(
          res.map((r) => ({ url: r.url, name: r.name })),
        );
        setFiles([]);
      },
      onUploadError: (error) => {
        console.error("Hook upload error:", error);
        alert(`Upload failed: ${error.message}`);
      },
      onUploadProgress: (p) => {
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
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Custom Hook Demo</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Use the <code>useUpload</code> hook to build a completely custom
        upload UI. You get full control over file selection, progress display,
        and abort functionality.
      </p>

      {/* ── Custom file input ────────────────────────────────────────── */}
      <div
        style={{
          padding: 24,
          border: "1px solid #e5e5e5",
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: 6,
              backgroundColor: isUploading ? "#f5f5f5" : "#fff",
              cursor: isUploading ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            Select Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {files.length > 0 && (
            <span style={{ marginLeft: 12, color: "#666", fontSize: 14 }}>
              {files.length} file(s) selected
            </span>
          )}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul
            style={{
              margin: "0 0 16px",
              padding: "0 0 0 20px",
              fontSize: 14,
              color: "#444",
            }}
          >
            {files.map((f) => (
              <li key={`${f.name}-${String(f.size)}`}>
                {f.name} ({(f.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        )}

        {/* Upload / Abort buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: 6,
              backgroundColor:
                files.length === 0 || isUploading ? "#ccc" : "#0070f3",
              color: "#fff",
              cursor:
                files.length === 0 || isUploading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {isUploading ? `Uploading... ${String(progress)}%` : "Upload"}
          </button>
          {isUploading && (
            <button
              type="button"
              onClick={abort}
              style={{
                padding: "8px 20px",
                border: "1px solid #e00",
                borderRadius: 6,
                backgroundColor: "#fff",
                color: "#e00",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Abort
            </button>
          )}
        </div>

        {/* Progress bar */}
        {isUploading && (
          <div
            style={{
              height: 6,
              backgroundColor: "#eee",
              borderRadius: 3,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${String(progress)}%`,
                backgroundColor: "#0070f3",
                transition: "width 150ms ease",
              }}
            />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>
              Upload Results
            </h3>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 20px",
                fontSize: 13,
                color: "#444",
              }}
            >
              {results.map((r) => (
                <li key={r.url}>
                  <strong>{r.name}</strong>:{" "}
                  <code style={{ fontSize: 12 }}>{r.url}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Code example ─────────────────────────────────────────────── */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Usage</h2>
        <pre
          style={{
            padding: 16,
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6,
            overflow: "auto",
          }}
        >
          {`const { startUpload, isUploading, progress, abort } =
  useUpload("imageUploader", {
    onClientUploadComplete: (res) => { /* handle results */ },
    onUploadError: (err) => { /* handle error */ },
    onUploadProgress: (p) => { /* 0-100 */ },
  });

// Start upload with selected files
await startUpload(files);

// Abort in-progress upload
abort();`}
        </pre>
      </section>
    </div>
  );
}
