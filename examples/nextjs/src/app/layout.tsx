import type { Metadata } from "next";
import "./globals.css";

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
      <body className="m-0 bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <nav className="mx-auto flex max-w-5xl items-center gap-4">
            <a href="/" className="text-lg font-bold text-slate-900 no-underline">
              @s3-good
            </a>
            <a href="/button-demo" className="text-sm text-slate-600 no-underline hover:text-slate-900">
              Button
            </a>
            <a href="/dropzone-demo" className="text-sm text-slate-600 no-underline hover:text-slate-900">
              Dropzone
            </a>
            <a href="/custom-hook" className="text-sm text-slate-600 no-underline hover:text-slate-900">
              Custom Hook
            </a>
            <a href="/themed" className="text-sm text-slate-600 no-underline hover:text-slate-900">
              Themed
            </a>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
