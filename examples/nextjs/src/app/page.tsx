export default function HomePage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        @s3-good Upload SDK — Example App
      </h1>
      <p className="mb-8 text-slate-600">
        This app demonstrates every upload pattern supported by the SDK.
        Choose a demo from the navigation above.
      </p>

      <div className="grid gap-4">
        <DemoCard
          href="/button-demo"
          title="UploadButton"
          description="Simple file picker button with auto and manual upload modes."
        />
        <DemoCard
          href="/dropzone-demo"
          title="UploadDropzone"
          description="Drag-and-drop zone with image previews and progress bar."
        />
        <DemoCard
          href="/custom-hook"
          title="Custom Hook"
          description="Build a fully custom upload UI with the useUpload hook."
        />
        <DemoCard
          href="/themed"
          title="Themed Components"
          description="Customize appearance and content of built-in components."
        />
      </div>

      <section className="mt-12">
        <h2 className="mb-3 text-xl font-semibold">Server Routes</h2>
        <p className="mb-4 text-sm text-slate-600">
          Defined in <code>src/server/upload-router.ts</code> — four endpoints
          demonstrating different configurations:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
          <li>
            <strong>imageUploader</strong> — up to 4 images (4MB each),
            middleware with auth extraction
          </li>
          <li>
            <strong>documentUploader</strong> — PDF + text files, with{" "}
            <code>.input()</code> Zod validation
          </li>
          <li>
            <strong>videoUploader</strong> — videos up to 256MB
          </li>
          <li>
            <strong>anyFileUploader</strong> — any file type (blob), up to 10
            files (32MB each)
          </li>
        </ul>
      </section>
    </div>
  );
}

function DemoCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-slate-200 bg-white px-6 py-5 text-inherit no-underline shadow-xs transition hover:border-slate-300 hover:shadow-sm"
    >
      <h3 className="mb-1 text-base font-medium">{title}</h3>
      <p className="m-0 text-sm text-slate-600">{description}</p>
    </a>
  );
}
