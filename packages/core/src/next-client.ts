import type { FileRouter } from "./_internal/types";

interface LocalUploadButtonProps {
  endpoint: string;
  input?: Record<string, unknown>;
  onClientUploadComplete?: (res: unknown[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  appearance?: Record<string, unknown>;
  content?: Record<string, unknown>;
  disabled?: boolean;
  mode?: "auto" | "manual";
  __internal?: { url?: string };
  [key: string]: unknown;
}

interface LocalUploadDropzoneProps extends LocalUploadButtonProps {
  onPaste?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reactPkgCache: any = null;
const importModuleDynamically = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<unknown>;

/**
 * Load @s3-good/react lazily only when client helpers are used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getReactPkg(): Promise<any> {
  if (reactPkgCache) return reactPkgCache;
  try {
    reactPkgCache = await importModuleDynamically("@s3-good/react");
    return reactPkgCache;
  } catch (err) {
    throw new Error(
      "@s3-good/react is required for next-client helpers. Install it with: pnpm add @s3-good/react",
      { cause: err },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateUploadButton<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const reactPkg = await getReactPkg();
  const url = opts?.url ?? "/api/upload";

  function TypedUploadButton(
    props: Omit<LocalUploadButtonProps, "__internal">,
  ) {
    return reactPkg.UploadButton({
      ...props,
      __internal: { url },
    });
  }

  return TypedUploadButton;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateUploadDropzone<TRouter extends FileRouter>(opts?: {
  url?: string;
}) {
  const reactPkg = await getReactPkg();
  const url = opts?.url ?? "/api/upload";

  function TypedUploadDropzone(
    props: Omit<LocalUploadDropzoneProps, "__internal">,
  ) {
    return reactPkg.UploadDropzone({
      ...props,
      __internal: { url },
    });
  }

  return TypedUploadDropzone;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateNextHelpers<TRouter extends FileRouter>(
  opts?: { url?: string },
) {
  const reactPkg = await getReactPkg();
  return reactPkg.generateReactHelpers({
    url: opts?.url ?? "/api/upload",
  });
}
