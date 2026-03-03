# s3-good

## 0.1.0

### Major Changes

- [#2](https://github.com/clopca/aws-s3-sdk-but-good/pull/2) [`c1ebc68`](https://github.com/clopca/aws-s3-sdk-but-good/commit/c1ebc686ba08ff9e7791f2a80c6375ee2a092bfc) Thanks [@clopca](https://github.com/clopca)! - Introduce a new high-level client API for browser uploads with queueing, retries, pause/resume, cancellation, and lifecycle events.

  ### Breaking changes
  - Set minimum supported Node.js version to `>=20.19.0` across packages.
  - Add `s3-good` root export (`s3-good`) as the official server alias in addition to subpath exports.
  - `@s3-good/react` now builds on `createS3GoodClient` for upload orchestration and exposes queue helpers from `generateReactHelpers`.

  ### Improvements
  - New `createS3GoodClient` API in `s3-good/client`:
    - `enqueueUpload`, `getQueueState`, `resumePending`
    - queue controls: `pause`, `resume`, `cancel`
    - retry policy with exponential backoff
    - lifecycle events for upload state transitions
  - Expanded shared error model with new client-facing codes and metadata (`retryable`, `hint`, `docsUrl`, `causeCode`).
  - Added coverage tests for high-level queue/retry/pause/resume/cancel behavior.

### Patch Changes

- [`5c19ffa`](https://github.com/clopca/aws-s3-sdk-but-good/commit/5c19ffa9b4af2ae2ff21893fc44450c059a36890) Thanks [@clopca](https://github.com/clopca)! - Prepare npm release with publish-readiness improvements:
  - finalize browser virtualization/state stability improvements
  - align core Next entrypoints (`next` server, `next-client` client helpers)
  - improve shared/browser type and preview detection behavior
  - refresh package/repository documentation and release metadata

- Updated dependencies [[`c1ebc68`](https://github.com/clopca/aws-s3-sdk-but-good/commit/c1ebc686ba08ff9e7791f2a80c6375ee2a092bfc), [`5c19ffa`](https://github.com/clopca/aws-s3-sdk-but-good/commit/5c19ffa9b4af2ae2ff21893fc44450c059a36890)]:
  - @s3-good/react@0.1.0
  - Internal dependency updates (non-public package surface).
