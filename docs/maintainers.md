# Maintainer Runbook

This runbook covers release flow and quality gates for maintainers.

## Release model

- Versioning: Changesets
- Publish trigger: `main` branch via `.github/workflows/release.yml`
- Registry auth: `NPM_TOKEN` repository secret

## Required checks before merge

```bash
pnpm ci:required
pnpm release:verify
pnpm size:check
```

Quality gate policy:

- Pull requests touching public package behavior should include a changeset.

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
- E2E currently runs with `continue-on-error: true` until stabilized.

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
