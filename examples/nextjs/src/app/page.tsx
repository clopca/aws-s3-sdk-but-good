export default function HomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        @s3-good Upload SDK — Example App
      </h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        This app demonstrates every upload pattern supported by the SDK.
        Choose a demo from the navigation above.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
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

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Server Routes</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 16 }}>
          Defined in <code>src/server/upload-router.ts</code> — four endpoints
          demonstrating different configurations:
        </p>
        <ul style={{ lineHeight: 1.8, fontSize: 14, color: "#444" }}>
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
      style={{
        display: "block",
        padding: "20px 24px",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        backgroundColor: "#fff",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{description}</p>
    </a>
  );
}
