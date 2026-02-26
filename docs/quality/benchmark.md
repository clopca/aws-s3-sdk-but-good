# Quality Benchmark (Top 8 Repos)

This benchmark captures quality patterns from high-trust repos and maps them to this monorepo.

## Comparison Matrix

| Repo | Packaging | Exports/Types | CI Gates | Release/Provenance | Docs Onboarding | Contribution Model |
| --- | --- | --- | --- | --- | --- | --- |
| `vitejs/vite` | Tight package boundaries and dist control | Explicit entrypoint strategy | Multi-job CI with strict checks | Automated release discipline | Fast-start docs and migration docs | Strong contributor docs and templates |
| `sindresorhus/type-fest` | Minimal package footprint | Type-first contract surface | Type-focused validation | Predictable release process | README as canonical docs | Strict contribution expectations |
| `tanstack/query` | Workspace package consistency | Public API stability focus | Strong test matrix and checks | Structured release process | Learn-first docs IA | Clear governance and RFC-like evolution |
| `vercel/next.js` | Large monorepo package governance | Contract-heavy types and APIs | Extensive CI pipelines | High rigor release flow | Excellent quick-start paths | Formal issue/PR process |
| `pnpm/pnpm` | Distribution correctness and pack discipline | Stable CLI/API contracts | Deep CI coverage | Automated publishing with safeguards | Docs + recipes | Maintainer process clarity |
| `unjs/ofetch` | Lean package publish | Clear ESM/CJS type story | Focused CI checks | Automated release | Concise usage docs | Lightweight but explicit contribution rules |
| `tailwindlabs/tailwindcss` | Consistent package operations | Typed public interfaces | Strong test automation | Proven release hygiene | Excellent onboarding and troubleshooting | Mature issue/PR hygiene |
| `vitest-dev/vitest` | Package quality and tooling cohesion | Strong TS contracts | Robust CI + matrix | Automated release workflows | Quick-start + advanced docs split | Clear contribution standards |

## Prioritized Checklist

### Must

- Add package-quality gate: `publint`, ATTW, and `pnpm pack` validation.
- Enforce docs snippet validation in CI to prevent drift.
- Move release to trusted publishing + provenance.
- Add Dependabot for npm and GitHub Actions.
- Add Node 20/22 CI matrix and align runtime baseline.

### Should

- Add API contract tests for exported entry points and declaration artifacts.
- Establish nightly blocking workflow for deep checks + E2E.
- Normalize package READMEs to a consistent troubleshooting/security structure.

### Nice

- Add dedicated coverage badge/report publication.
- Add dependency review / security scan jobs for PRs.
- Add docs link-check and docs build preview checks.

## Repo Mapping

- CI quality gates: `.github/workflows/ci.yml`
- Nightly strict checks: `.github/workflows/nightly.yml`
- Release provenance: `.github/workflows/release.yml`
- Dependency updates: `.github/dependabot.yml`
- Docs snippet validation: `tests/docs-snippets/validate-snippets.mjs`
- Public API contract tests: `tests/infrastructure/public-contract.test.ts`
- Docs onboarding pages:
  - `docs/src/content/docs/getting-started/start-in-5-minutes.mdx`
  - `docs/src/content/docs/getting-started/common-errors.mdx`
  - `docs/src/content/docs/getting-started/scenarios.mdx`
- Maintainer governance: `docs/maintainers.md`
