---
"@s3-good/core": major
"@s3-good/react": major
"@s3-good/browser": major
"@s3-good/shared": major
---

Introduce a new high-level client API for browser uploads with queueing, retries, pause/resume, cancellation, and lifecycle events.

### Breaking changes

- Set minimum supported Node.js version to `>=20.0.0` across packages.
- Add `@s3-good/core` root export (`@s3-good/core`) as the official server alias in addition to subpath exports.
- `@s3-good/react` now builds on `createS3GoodClient` for upload orchestration and exposes queue helpers from `generateReactHelpers`.

### Improvements

- New `createS3GoodClient` API in `@s3-good/core/client`:
  - `enqueueUpload`, `getQueueState`, `resumePending`
  - queue controls: `pause`, `resume`, `cancel`
  - retry policy with exponential backoff
  - lifecycle events for upload state transitions
- Expanded shared error model with new client-facing codes and metadata (`retryable`, `hint`, `docsUrl`, `causeCode`).
- Added coverage tests for high-level queue/retry/pause/resume/cancel behavior.
