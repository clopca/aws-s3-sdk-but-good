import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MobileNav } from "~/components/mobile-nav";
import { ThemeProvider } from "~/components/theme-provider";
import { ThemeToggle } from "~/components/theme-toggle";
import { Toaster } from "~/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "s3-good — Upload SDK Examples",
  description:
    "Demonstrates UploadButton, UploadDropzone, custom hook usage, and theming with @s3-good SDK.",
};

const navLinks = [
  { href: "/button-demo", label: "Button" },
  { href: "/dropzone-demo", label: "Dropzone" },
  { href: "/custom-hook", label: "Custom Hook" },
  { href: "/themed", label: "Themed" },
  { href: "/browser", label: "Browser" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
            <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground no-underline"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-background">
                  S3
                </span>
                s3-good
              </Link>
              <div className="hidden items-center gap-1 sm:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <MobileNav />
                <ThemeToggle />
              </div>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-5xl px-6 py-10">
            {children}
          </main>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
