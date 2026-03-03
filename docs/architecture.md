# Architecture

This document explains package boundaries, runtime separation, and key design decisions in `s3-good`.

## Monorepo package boundaries

- `@s3-good-internal/shared` (internal only)
  - Cross-package types, errors, and utility functions.
  - No framework-specific behavior.
  - Not part of the public API surface.
- `s3-good`
  - Upload route builder and server/client protocol implementation.
  - Framework adapters (`next`, `hono`) and S3 SDK utilities.
- `@s3-good/react`
  - Upload-focused React UI and typed helpers on top of `s3-good/client`.
- `@s3-good/browser`
  - File browser UI + browser client/store/hooks for list/manage/preview workflows.

Dependency direction is intentionally one-way:

- `@s3-good-internal/shared` <- `s3-good` <- (`@s3-good/react`, `@s3-good/browser`)

`@s3-good/react` and `@s3-good/browser` should not become dependencies of `s3-good` server entry points.

## Runtime model

### Upload flow

1. Client requests route config (`GET /api/upload?slug=...`).
2. Client sends upload action payload (`POST /api/upload`).
3. Server validates route + input + file constraints.
4. Server returns presigned URLs / multipart instructions.
5. Client uploads directly to S3.
6. Client calls completion action.
7. Server runs `onUploadComplete` and returns typed `serverData`.

### Browser flow

1. UI calls `/api/browser` with action payloads (`list`, `delete`, `rename`, etc.).
2. Server enforces configured bucket/prefix/action constraints.
3. Server performs S3 operations and returns normalized `BrowserActionResponse`.
4. Browser store updates UI state (items, selection, pagination, errors).

## Entry-point separation (critical)

`s3-good` uses explicit entry points to prevent server/client boundary leaks:

- `s3-good/next`
  - Server-only Next.js route handlers.
  - Must not import React UI modules.
- `s3-good/next-client`
  - Async client helper factories that lazily access `@s3-good/react`.

Why this exists:

- Next.js App Router and Turbopack enforce server/client boundaries.
- Mixing client hooks into server route imports causes build/runtime failures.
- The split keeps route handlers safe for server environments.

## State and UI architecture (`@s3-good/browser`)

- `createBrowserClient`
  - HTTP transport for browser actions.
- `createBrowserStore`
  - Framework-agnostic state container.
- `useBrowser`
  - React hook that binds store + client + async lifecycle.
- `S3Browser`
  - Opinionated composed UI.
- `S3BrowserRoot` + compound components
  - Headless/composable mode for custom layouts.

This separation allows transport/state logic to be tested independently from UI rendering.

## Type-safety strategy

- Server routes are defined with `createUploader()` and constrained by `FileRouter`.
- Client helpers infer endpoint names and input/output from router types.
- Shared request/response payload contracts are re-exported from `s3-good/types`.

Result:

- Endpoint typos are compile-time errors.
- Route-specific input mismatches are compile-time errors.
- `serverData` shape is inferred end-to-end.

## Design decisions (ADR summary)

### ADR-001: Keep shared domain contracts in `@s3-good-internal/shared`

Status: accepted.

Rationale:

- Avoid duplicate model definitions across packages.
- Keep core protocol and UI packages aligned.

### ADR-002: Split `s3-good/next` and `s3-good/next-client`

Status: accepted.

Rationale:

- Prevent client hooks/UI imports from contaminating server route bundles.
- Make Next.js boundary behavior explicit and maintainable.

### ADR-003: Browser uses store + client + UI layering

Status: accepted.

Rationale:

- Better testability and clearer responsibilities.
- Enables both batteries-included and headless composition modes.

## Extension points

- Add framework adapters in `s3-good` (same route protocol).
- Add UI packages without changing core protocol.
- Extend browser actions while preserving `BrowserActionPayload/Response` compatibility.

## Guardrails for future changes

- Do not import `@s3-good/react` from server entry points.
- Keep `@s3-good-internal/shared` free of framework/runtime side effects.
- Add tests for boundary-sensitive behavior (Next.js server/client, hook-order stability, browser action validation).
- Update README/docs when changing public entry points or contracts.
