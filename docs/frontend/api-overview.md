# API Overview

> Version: `v1` (base path: `/api/v1/`), except `/api/health` which is unversioned for operational readiness. Google’s AIP recommends URI-segment versioning and keeping one GA “latest” at a time. ([aip.dev][1])

All successful responses use `application/json` with a minimal envelope; all errors use `application/problem+json` per **RFC 9457** (which **obsoletes RFC 7807**). Servers **MUST** set the appropriate `Content-Type`. ([datatracker.ietf.org][2])

Success

```json
{ "ok": true, "data": { /* payload */ } }
```

Error

```json
{
  "type": "about:blank",
  "title": "Invalid argument",
  "status": 400,
  "detail": "…",
  "instance": "/api/v1/…"
}
```

Error bodies follow RFC 9457; custom members are allowed for machine-readable details. ([rfc-editor.org][3])

## Versioning

Use `v1` as the base path and evolve compatibly; ship breaking changes as `v2`. Keep a single “latest” GA version; deprecate previews quickly. ([aip.dev][1])

## Media types & content negotiation

Clients SHOULD send `Accept: application/json`. The server MAY honor `+json` types via the structured syntax suffix (e.g., `application/problem+json`). If `Accept` excludes JSON, respond `406 Not Acceptable`. ([datatracker.ietf.org][4])

## HTTP status

Use standard semantics: `200` for successful reads, `201` for creations, `401` for missing/invalid session, `403` for forbidden, `404` for not found, `415` for non-JSON request bodies, and `5xx` for server-side failures. ([rfc-editor.org][5])

## Caching

Unless documented otherwise, endpoints return `Cache-Control: no-store` to avoid reuse of potentially stale representations (notably health, auth, and session-scoped reads). ([MDN Web Docs][6])

## Tracing

Requests may include `traceparent`. The server will echo the incoming value or generate a new one in **W3C Trace Context** format to support end-to-end correlation. ([W3C][7])

## Authentication

A session cookie named `sid` is set on successful login. Attributes: `HttpOnly; Path=/; SameSite=Lax; Max-Age=<env>` and `Secure` in production. Sign-in is restricted to `@studenti.unitn.it`. In development, the magic link is returned inline for convenience; in production, only a generic success is returned and the link is delivered by email. ([Google Cloud][8])

---

# Endpoints

## Health (unversioned)

### `GET /api/health`

Returns `200` with `{ "ok": true, "data": { "db": "ok" | "skipped", "time": <epoch> } }` when dependencies are reachable; otherwise `503` with a problem document. Always `Cache-Control: no-store`. If `Accept` excludes JSON (including all `+json` types), return `406` with a problem document. ([rfc-editor.org][5], [datatracker.ietf.org][4])

### `HEAD /api/health`

Returns `200` (healthy) or `503` (unhealthy) with no body; always `Cache-Control: no-store`. Rationale: an unversioned health path avoids breaking automation and aligns with operational probes that expect a stable URL. ([aip.dev][1])

---

## Auth

All request bodies MUST be `application/json`; otherwise return `415` with a problem document. ([rfc-editor.org][5])

### `POST /api/v1/auth/requestLink`

Input

```json
{ "email": "user@studenti.unitn.it" }
```

Output (development)

```json
{ "ok": true, "data": { "magicUrl": "https://.../auth/verify?token=..." } }
```

Output (production)

```json
{ "ok": true }
```

Issues a one-time login token if the email domain is allowed. In development the `magicUrl` is returned; in production, the server sends mail and returns a generic success. ([Google Cloud][8])

### `GET /api/v1/auth/verify?token=…`

### `POST /api/v1/auth/verify`

Verifies a one-time token, upserts the user, establishes a session, and sets the `sid` cookie.

Success

```json
{ "ok": true, "data": { "userId": "u_...", "email": "user@studenti.unitn.it" } }
```

Invalid/expired tokens return `401` with a problem document. ([rfc-editor.org][5])

### `POST /api/v1/auth/logout`

Clears the `sid` cookie and returns `{ "ok": true }`. In production the cookie is set/cleared with `Secure`. ([rfc-editor.org][5])

---

## Users

### `GET /api/v1/users/me`

Returns the authenticated user or `401` if the session is missing/invalid.

```json
{ "ok": true, "data": { "id": "u_...", "slug": "alice", "email": "…" } }
```

Use `403` for authenticated-but-forbidden access to other users’ resources. ([rfc-editor.org][5])

### `GET /api/v1/users/{slug}`

Public, cache-negotiated read (ETag/If-None-Match supported by the handler), returning basic profile fields; `404` if not found. Slugs are stable, URL-safe identifiers intended for discovery and navigation. ([aip.dev][1])

### `GET /api/v1/users`

Lists users with basic fields; future versions may introduce pagination tokens and filters consistent with AIP-158/160. ([aip.dev][9], [Google AIP][10])

### `GET /api/v1/users/{slug}/submissions`

Returns public submissions for a given user, newest first. Authorization rules may further restrict fields in non-public scenarios. ([Google Cloud][8])

---

## Schools

### `GET /api/v1/schools`

Returns an array of schools (id/slug/name/updated\_at). List endpoints are designed to adopt cursor pagination in a future revision (AIP-158). ([aip.dev][9])

### `GET /api/v1/schools/{school}`

Retrieves a school by **slug**; `404` if not found. Slug-based resource naming supports human-readable discovery while remaining URL-safe. ([aip.dev][1])

---

## Courses

### `GET /api/v1/schools/{school}/courses`

Lists courses under a school (by school **slug**). Future revisions may add pagination and filtering (AIP-158/160). ([aip.dev][9], [Google AIP][10])

### `GET /api/v1/schools/{school}/courses/{course}`

Retrieves a course by `{school slug}/{course slug}`; `404` if not found. Hierarchical URIs mirror containment and improve navigability. ([aip.dev][1])

---

## Problems

### `GET /api/v1/schools/{school}/courses/{course}/problems`

Lists problems under a course (by slugs). This endpoint is for discovery/navigation. ([aip.dev][1])

### `GET /api/v1/schools/{school}/courses/{course}/problems/{problem}`

Retrieves a problem by three slugs. The response contains metadata (name/description), language limits, code/time/memory limits, and an optional structured `artifact` (JSON). ([Cloudflare Docs][11])

### `GET /api/v1/problems/{id}`

Retrieves a problem by **id** (stable identifier). ID-based paths support “stable addressing” from logs, queues, or emails without requiring the hierarchical context. This dual model—slug for discovery, id for stability—follows common AIP guidance on resource names. ([aip.dev][1])

---

## Submissions

### `POST /api/v1/problems/{id}/submissions`

Creates a submission for a problem id; body:

```json
{ "code": "…", "language": "cpp23" }
```

Response (`201 Created`)

```json
{
  "ok": true,
  "data": {
    "submissionId": "s_…",
    "userId": "u_…",
    "problemId": "…",
    "status": "IQ",
    "createdAt": 1736272000
  }
}
```

The server enqueues an asynchronous judge task and returns `201` with the resource representation; failures return a problem document. ([rfc-editor.org][5])

### `GET /api/v1/submissions/{id}`

Retrieves a submission by id (public fields). If private data exists, apply authorization (owner-only `403`). `404` if not found. ([rfc-editor.org][5])

### `GET /api/v1/problems/{id}/submissions`

Lists public submissions for a given problem (newest first). ([Google Cloud][8])

### `GET /api/v1/users/{slug}/submissions`

Lists public submissions for a given user (newest first). ([Google Cloud][8])

> Notes on lists: while the current API supports a simple `limit`, future versions are expected to adopt **AIP-158** token-based pagination and optional **AIP-160** filters. ([aip.dev][9], [Google AIP][10])

---

# Error Model

* All errors use **RFC 9457** (`type`, `title`, `status`, `detail`, `instance`), with optional custom members. Use `Content-Type: application/problem+json`. When `Accept` excludes JSON, respond `406` with a problem document to explain negotiation failure. ([datatracker.ietf.org][2])
* JSON family is recognized via the `+json` structured syntax suffix, so `application/problem+json` participates in negotiation correctly. ([datatracker.ietf.org][4])