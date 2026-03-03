# Contributing

Thanks for contributing to `s3-good`.

## Prerequisites

- Node.js `>=20.19.0`
- `pnpm@10`
- AWS test credentials only if you run E2E tests

## Setup

```bash
pnpm install
```

Docs site setup:

```bash
cd docs
pnpm install
pnpm dev
```

## Development workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run quality checks locally.
4. Open a PR with clear scope and test evidence.

## Local quality checks

Run all checks:

```bash
pnpm ci:required
pnpm release:verify
```

Run checks for one package:

```bash
pnpm --filter s3-good test
pnpm --filter @s3-good/browser lint
pnpm --filter @s3-good/react typecheck
```

## Changesets and versioning

This monorepo uses Changesets.

- Add a changeset for any user-facing package change:

```bash
pnpm changeset
```

- Commit the generated file under `.changeset/`.
- Maintainer release flow is documented in [docs/maintainers.md](./docs/maintainers.md).

## Coding expectations

- Keep APIs typed and backward-compatible unless a breaking change is intentional.
- Prefer small, composable primitives over one-off abstractions.
- Add or update tests for behavior changes.
- Update package README/docs for public API changes.

## Pull request checklist

- [ ] Scope is clear and minimal
- [ ] Tests added/updated
- [ ] Build/typecheck/lint pass locally
- [ ] Changeset added (if public package behavior changed)
- [ ] Docs updated (README/docs pages)

## Commit messages

Use concise conventional-style messages when possible.

Examples:

- `fix(core): validate multipart upload completion payload`
- `feat(browser): add infinite pagination mode`
- `docs(core): clarify next-client helper usage`

## Reporting bugs

Open an issue with:

- Expected behavior
- Actual behavior
- Reproduction steps
- Environment (Node, package versions, framework)

For security issues, do not open a public issue. See [SECURITY.md](./SECURITY.md).

## Community standards

By participating, you agree to follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
For support expectations and channels, see [SUPPORT.md](./SUPPORT.md).
