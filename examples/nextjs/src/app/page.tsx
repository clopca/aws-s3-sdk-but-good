import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const demos = [
  {
    href: "/button-demo",
    icon: "🔘",
    title: "Upload Button",
    description:
      "Simple file picker button with auto and manual upload modes.",
  },
  {
    href: "/dropzone-demo",
    icon: "📥",
    title: "Dropzone",
    description:
      "Drag-and-drop zone with image previews and progress tracking.",
  },
  {
    href: "/custom-hook",
    icon: "🪝",
    title: "Custom Hook",
    description:
      "Build a fully custom upload UI with the useUpload hook.",
  },
  {
    href: "/themed",
    icon: "🎨",
    title: "Themed Components",
    description:
      "Customize appearance and content of built-in components.",
  },
  {
    href: "/browser",
    icon: "📂",
    title: "S3 Browser",
    description:
      "Modern file browser for listing, previewing, and managing S3 files.",
  },
];

const routes = [
  {
    name: "imageUploader",
    description: "Up to 4 images (4 MB each), middleware with auth extraction",
  },
  {
    name: "documentUploader",
    description: "PDF + text files, with .input() Zod validation",
  },
  {
    name: "videoUploader",
    description: "Videos up to 256 MB",
  },
  {
    name: "anyFileUploader",
    description: "Any file type (blob), up to 10 files (32 MB each)",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">s3-good</h1>
          <Badge variant="secondary" className="text-xs">
            v0.1
          </Badge>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Type-safe, direct-to-S3 file uploads for React and Next.js.
          Drop-in components, hooks, and a server router — everything you need
          to ship uploads fast.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">Type-safe</Badge>
          <Badge variant="outline">Direct-to-S3</Badge>
          <Badge variant="outline">React Components</Badge>
          <Badge variant="outline">Presigned URLs</Badge>
          <Badge variant="outline">Progress Tracking</Badge>
        </div>
      </section>

      {/* Get Started */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Get Started</h2>
        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
            <CardDescription>
              Install the packages and start uploading in minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-zinc-100">
              <p className="text-zinc-500"># Install core + React components</p>
              <p>
                <span className="text-emerald-400">pnpm</span> add @s3-good/core
                @s3-good/react
              </p>
              <p className="mt-3 text-zinc-500"># Optional: file browser</p>
              <p>
                <span className="text-emerald-400">pnpm</span> add
                @s3-good/browser
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed text-zinc-100">
              <p className="text-zinc-500">
                {"// Define your upload routes (server)"}
              </p>
              <p>
                <span className="text-violet-400">import</span>{" "}
                {"{ createUploader }"}{" "}
                <span className="text-violet-400">from</span>{" "}
                <span className="text-amber-300">
                  {'"@s3-good/core/server"'}
                </span>
                ;
              </p>
              <p className="mt-2">
                <span className="text-violet-400">const</span>{" "}
                <span className="text-sky-300">f</span> ={" "}
                <span className="text-yellow-200">createUploader</span>();
              </p>
              <p className="mt-2">
                <span className="text-violet-400">export const</span>{" "}
                <span className="text-sky-300">uploadRouter</span> = {"{"}
              </p>
              <p className="pl-4">
                <span className="text-sky-300">imageUploader</span>:{" "}
                <span className="text-yellow-200">f</span>({"{"}{" "}
                <span className="text-sky-300">image</span>: {"{"}{" "}
                <span className="text-sky-300">maxFileSize</span>:{" "}
                <span className="text-amber-300">{'"4MB"'}</span> {"}"} {"}"})
              </p>
              <p className="pl-6">
                .<span className="text-yellow-200">onUploadComplete</span>(
                {"({ file }) => "}
                <span className="text-yellow-200">console</span>.
                <span className="text-yellow-200">log</span>(file)),
              </p>
              <p>{"}"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Demo Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Demos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((demo) => (
            <Link
              key={demo.href}
              href={demo.href}
              className="group no-underline"
            >
              <Card className="h-full transition-colors hover:border-foreground/20 hover:bg-accent/50">
                <CardHeader>
                  <div className="mb-1 text-2xl">{demo.icon}</div>
                  <CardTitle className="text-base group-hover:text-foreground">
                    {demo.title}
                  </CardTitle>
                  <CardDescription>{demo.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Server Routes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Server Routes
        </h2>
        <p className="text-sm text-muted-foreground">
          Defined in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs">
            src/server/upload-router.ts
          </code>{" "}
          — four endpoints demonstrating different configurations.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {routes.map((route) => (
            <Card key={route.name} className="bg-muted/30">
              <CardHeader className="p-4">
                <CardTitle className="font-[family-name:var(--font-geist-mono)] text-sm font-medium">
                  {route.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {route.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
