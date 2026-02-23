import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "@s3-good Example — Next.js Upload Patterns",
  description:
    "Demonstrates UploadButton, UploadDropzone, custom hook usage, and theming with @s3-good SDK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#fafafa",
          color: "#111",
        }}
      >
        <header
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e5e5e5",
            backgroundColor: "#fff",
          }}
        >
          <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a
              href="/"
              style={{
                fontWeight: 700,
                fontSize: 18,
                textDecoration: "none",
                color: "#111",
              }}
            >
              @s3-good
            </a>
            <a href="/button-demo" style={navLinkStyle}>
              Button
            </a>
            <a href="/dropzone-demo" style={navLinkStyle}>
              Dropzone
            </a>
            <a href="/custom-hook" style={navLinkStyle}>
              Custom Hook
            </a>
            <a href="/themed" style={navLinkStyle}>
              Themed
            </a>
          </nav>
        </header>
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#666",
  textDecoration: "none",
  fontSize: 14,
};
