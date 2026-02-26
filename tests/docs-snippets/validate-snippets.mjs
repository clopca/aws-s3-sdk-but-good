import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const ROOT = resolve(process.cwd());
const DOCS_DIR = join(ROOT, "docs", "src", "content", "docs");

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const absolute = join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      files.push(...walk(absolute));
      continue;
    }
    if (absolute.endsWith(".mdx") || absolute.endsWith(".md")) {
      files.push(absolute);
    }
  }
  return files;
}

function parseSnippets(content) {
  const snippets = [];
  const fence = /```([a-zA-Z0-9_-]+)([^\n]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = fence.exec(content)) !== null) {
    snippets.push({
      lang: match[1]?.trim().toLowerCase(),
      meta: match[2]?.trim() ?? "",
      code: match[3] ?? "",
    });
  }
  return snippets;
}

function extFromLang(lang) {
  if (lang === "ts" || lang === "typescript") return ".ts";
  if (lang === "tsx") return ".tsx";
  if (lang === "js" || lang === "javascript") return ".js";
  if (lang === "jsx") return ".jsx";
  return null;
}

function compileSnippet(fileName, code, jsx) {
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      skipLibCheck: true,
    },
    reportDiagnostics: true,
    fileName,
  });

  return transpiled.diagnostics ?? [];
}

function normalizeSnippet(code) {
  return code
    .split("\n")
    .filter((line) => line.trim() !== "...")
    .join("\n")
    .trim();
}

function validateCode(fileName, code, extension) {
  const normalized = normalizeSnippet(code);
  const isJsx = extension === ".tsx" || extension === ".jsx";
  const diagnostics = [];

  const attempts = [normalized];

  if (isJsx) {
    const hasModuleSyntax = /\b(import|export)\b/.test(normalized);
    if (!hasModuleSyntax) {
      attempts.push(`const __snippet = () => (\n<>\n${normalized}\n</>\n);`);
    }
  } else {
    attempts.push(`(() => {\n${normalized}\n})();`);
    attempts.push(`const __snippet = (\n${normalized}\n);`);
  }

  for (const attempt of attempts) {
    const result = compileSnippet(fileName, attempt, isJsx);
    if (result.length === 0) return [];
    diagnostics.push(result);
  }

  return diagnostics[0] ?? [];
}

const files = walk(DOCS_DIR);
const failures = [];
let checked = 0;
let skippedWithoutTitle = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const snippets = parseSnippets(content);
  snippets.forEach((snippet, index) => {
    const extension = extFromLang(snippet.lang);
    if (!extension) return;
    if (!/title\s*=/.test(snippet.meta)) {
      skippedWithoutTitle += 1;
      return;
    }

    const fileName = `${relative(ROOT, file)}#snippet-${index + 1}${extension}`;
    const diagnostics = validateCode(fileName, snippet.code, extension);
    checked += 1;

    if (diagnostics.length > 0) {
      const messages = diagnostics.map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n",
        );
        const line =
          diagnostic.file && typeof diagnostic.start === "number"
            ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
            : 0;
        return `${message}${line ? ` (line ${line})` : ""}`;
      });
      failures.push({
        file: relative(ROOT, file),
        snippet: index + 1,
        lang: snippet.lang,
        messages,
      });
    }
  });
}

if (checked === 0) {
  console.error("No TS/JS snippets found in docs.");
  process.exit(1);
}

if (failures.length > 0) {
  console.error(`Found ${failures.length} invalid docs snippet(s):`);
  for (const failure of failures) {
    console.error(
      `- ${failure.file} [snippet ${failure.snippet}, ${failure.lang}]`,
    );
    for (const message of failure.messages) {
      console.error(`  • ${message}`);
    }
  }
  process.exit(1);
}

console.log(
  `Validated ${checked} docs snippets successfully (${skippedWithoutTitle} skipped without title metadata).`,
);
