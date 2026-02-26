# Maintainer Runbook

This runbook covers release flow and quality gates for maintainers.

## Release model

- Versioning: Changesets
- Publish trigger: `main` branch via `.github/workflows/release.yml`
- Registry auth: npm trusted publishing (OIDC provenance)

## Required checks before merge

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:docs-snippets
pnpm test:package-quality
pnpm size:check
```

## Maintainer SLA

- New issues: first triage response within 2 business days.
- New pull requests: first review pass within 2 business days.
- Release-blocking bugs: acknowledge within 1 business day and assign owner.

## Making a release

1. Ensure user-facing changes include changesets.
2. Merge PRs into `main`.
3. Release workflow will open/update version PR or publish.
4. Validate published packages on npm and tags/releases on GitHub.

Manual local flow (if needed):

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

## CI/CD notes

- CI workflow: `.github/workflows/ci.yml`
- Release workflow: `.github/workflows/release.yml`
- Nightly quality workflow: `.github/workflows/nightly.yml`
- E2E is non-blocking in PRs but blocking in nightly runs.

## Release checklist (mandatory)

- [ ] `pnpm build` green
- [ ] `pnpm typecheck` green
- [ ] `pnpm lint` green
- [ ] `pnpm test` green
- [ ] `pnpm test:docs-snippets` green
- [ ] Package quality checks green (`publint`, ATTW, pack validation)
- [ ] Nightly E2E run green (or equivalent manual rerun)
- [ ] Package README/docs updated for user-visible changes
- [ ] Changeset included for public behavior/API changes

## Incident response checklist

If a bad release is detected:

1. Stop further publish by pausing merges.
2. Identify affected package versions.
3. Ship patch release with fix and explicit changelog note.
4. If necessary, deprecate broken version(s) on npm.

## Documentation maintenance

For API or behavior changes:

- Update package README(s)
- Update product docs in `docs/src/content/docs`
- Update architecture notes when boundaries/decisions change (`docs/architecture.md`)
