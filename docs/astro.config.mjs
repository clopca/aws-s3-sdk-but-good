import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "@s3-good",
      social: {
        github: "https://github.com/clopca/aws-s3-sdk-but-good",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Quick Start", slug: "getting-started/quick-start" },
            { label: "S3 Setup", slug: "getting-started/s3-setup" },
          ],
        },
        {
          label: "Server",
          items: [
            { label: "File Router", slug: "server/file-router" },
            { label: "Next.js", slug: "server/next" },
            { label: "Hono", slug: "server/hono" },
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
            { label: "@s3-good/core", slug: "api/core" },
            { label: "@s3-good/react", slug: "api/react" },
          ],
        },
      ],
    }),
  ],
});
