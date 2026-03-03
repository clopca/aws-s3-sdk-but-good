# @s3-good-internal/shared

## 0.1.0

### Major Changes

- [#2](https://github.com/clopca/aws-s3-sdk-but-good/pull/2) [`c1ebc68`](https://github.com/clopca/aws-s3-sdk-but-good/commit/c1ebc686ba08ff9e7791f2a80c6375ee2a092bfc) Thanks [@clopca](https://github.com/clopca)! - Internal shared-model update for the new package architecture:
  - rename to `@s3-good-internal/shared` and keep it internal-only by convention
  - centralize cross-package shared types and utility primitives
  - expand shared error metadata (`retryable`, `hint`, `docsUrl`, `causeCode`)

### Patch Changes

- [`5c19ffa`](https://github.com/clopca/aws-s3-sdk-but-good/commit/5c19ffa9b4af2ae2ff21893fc44450c059a36890) Thanks [@clopca](https://github.com/clopca)! - Prepare npm release with publish-readiness improvements:
  - finalize browser virtualization/state stability improvements
  - align core Next entrypoints (`next` server, `next-client` client helpers)
  - improve shared/browser type and preview detection behavior
  - refresh package/repository documentation and release metadata
