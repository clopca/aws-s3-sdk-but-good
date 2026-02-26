# Docs Development

The documentation site lives in `/docs` and is built with Astro + Starlight.

## Run locally

```bash
cd docs
pnpm install
pnpm dev
```

## Build docs

```bash
cd docs
pnpm build
```

## Content location

- Main docs content: `docs/src/content/docs`
- Astro config: `docs/astro.config.mjs`
- Styles: `docs/src/styles/tailwind.css`

## Architecture

- System architecture and design decisions: [`architecture.md`](./architecture.md)
- Maintainer release/operations runbook: [`maintainers.md`](./maintainers.md)

## Writing guidance

- Keep examples aligned with current exports from each package.
- Prefer copy-paste runnable snippets.
- For API changes, update both package README and docs pages in the same PR.
- Validate docs snippets locally with `pnpm test:docs-snippets`.
