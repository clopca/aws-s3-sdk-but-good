import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "@s3-good",
      customCss: ["./src/styles/tailwind.css"],
      social: {
        github: "https://github.com/clopca/aws-s3-sdk-but-good",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            {
              label: "Start in 5 Minutes",
              slug: "getting-started/start-in-5-minutes",
            },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "Common Errors", slug: "getting-started/common-errors" },
            { label: "Scenarios", slug: "getting-started/scenarios" },
            { label: "S3 Setup", slug: "getting-started/s3-setup" },
          ],
        },
        {
          label: "Server",
          items: [
            { label: "File Router", slug: "server/file-router" },
            { label: "Next.js", slug: "server/next" },
            { label: "Hono", slug: "server/hono" },
            { label: "Browser Routes", slug: "server/browser" },
          ],
        },
        {
          label: "Client",
          items: [
            { label: "Upload Files", slug: "client/upload-files" },
            { label: "React Hooks", slug: "client/hooks" },
          ],
        },
        {
          label: "Components",
          items: [
            { label: "UploadButton", slug: "components/upload-button" },
            { label: "UploadDropzone", slug: "components/upload-dropzone" },
            { label: "FilePreview", slug: "components/file-preview" },
            { label: "ProgressBar", slug: "components/progress-bar" },
            { label: "FileList", slug: "components/file-list" },
            { label: "S3 Browser", slug: "components/s3-browser" },
            { label: "Headless Browser", slug: "components/headless-browser" },
          ],
        },
        {
          label: "Theming",
          items: [
            { label: "Appearance API", slug: "theming/appearance" },
          ],
        },
        {
          label: "API Reference",
          items: [
            { label: "s3-good", slug: "api/s3-good" },
            { label: "@s3-good/react", slug: "api/react" },
            { label: "@s3-good/browser", slug: "api/browser" },
          ],
        },
      ],
    }),
  ],
});
