# API Overview

> Version: `v1` (base path: `/api/v1/`), except `/api/health` which is unversioned for operational readiness. ([google.aip.dev][1])

All successful responses use `application/json` and follow a small envelope for consistency; all errors use `application/problem+json` (RFC 7807). ([Google Cloud][2], [datatracker.ietf.org][3])

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

Error bodies follow RFC 7807; servers SHOULD select an appropriate problem `type` URI and MUST set `Content-Type: application/problem+json`. ([datatracker.ietf.org][3])

## Versioning

Use a URI segment `v1` for the base path and evolve compatibly; breaking changes ship as `v2`. Keep one “latest” GA version and phase out preview versions quickly. ([google.aip.dev][1])

## Media types & content negotiation

Clients SHOULD send `Accept: application/json`; the server MAY also honor any `+json` media type per structured syntax suffix (e.g. `application/problem+json`). If the `Accept` header excludes JSON, the server returns `406 Not Acceptable`. ([datatracker.ietf.org][4])

## HTTP status

Use standard codes: `200` for successful reads, `201` for creations, `401` for missing/invalid session, `403` for forbidden, `404` for not found, `415` if the request body is not JSON, `5xx` for server-side failures. ([RFC Editor][5])

## Caching

Unless documented otherwise, endpoints return `Cache-Control: no-store` to prevent intermediaries or clients from reusing representations that could become stale, especially for health checks and auth flows.

## Tracing

Requests may include `traceparent`; the server will echo the incoming value or generate a new one in W3C Trace Context format to help end-to-end correlation. ([W3C][6])

## Authentication

Session cookie: `sid`, set on successful login; attributes include `HttpOnly; Path=/; SameSite=Lax; Max-Age=<env>` and `Secure` in production. Sign-in is limited to `@studenti.unitn.it` accounts. ([Google Cloud][2], [RFC Editor][5])

In development, the magic link is returned in the response for convenience; in production, it is delivered via email and only a generic success is returned. ([Google Cloud][2])

---

# Endpoints

## Health (unversioned)

### `GET /api/health`

Returns `200` with `{ "ok": true, "data": { "db": "ok", "time": <epoch> } }` if the database is reachable; returns `503` with `application/problem+json` if dependencies are unavailable. `Cache-Control: no-store`. ([Cloudflare Docs][7], [RFC Editor][5])

If the request’s `Accept` excludes JSON (including all `+json` types), the server returns `406` with a problem document. ([datatracker.ietf.org][8])

### `HEAD /api/health`

Returns `200` with no body when healthy; otherwise `503`, no body; always `Cache-Control: no-store`. ([RFC Editor][5])

> Rationale: Keeping health unversioned avoids breaking automation and aligns with operational probes that expect a stable path. ([google.aip.dev][1])

---

## Auth

All request bodies MUST be `application/json`; otherwise return `415` with a problem document. ([RFC Editor][5])

### `POST /api/v1/auth/requestLink`

Input

```json
{ "email": "user@studenti.unitn.it" }
```

Output (dev)

```json
{ "ok": true, "data": { "magicUrl": "https://.../auth/verify?token=..." } }
```

Output (prod)

```json
{ "ok": true }
```

Issues a one-time token for the provided email if the domain is allowed; dev returns the `magicUrl`, prod sends email only. ([Google Cloud][2])

### `GET /api/v1/auth/verify?token=…`

On success, upserts the user, establishes a session, sets `sid` cookie, and returns:

```json
{ "ok": true, "data": { "userId": "u_...", "email": "user@studenti.unitn.it" } }
```

On invalid/expired token, returns `401` with a problem document. ([RFC Editor][5])

### `POST /api/v1/auth/logout`

Clears the `sid` cookie; returns `{ "ok": true }`. In production the cookie is set/cleared with `Secure`. ([RFC Editor][5])

---

## Users

### `GET /api/v1/users/me`

Returns the authenticated user or `401` if the session is missing/invalid. Response:

```json
{ "ok": true, "data": { "userId": "u_...", "email": "..." } }
```

Use `403` for authenticated-but-forbidden access to other users’ resources. ([RFC Editor][5])

---

## Schools

### `GET /api/v1/schools`

Returns an array of schools:

```json
{ "ok": true, "data": [ { "id": "school_…", "slug": "unitn", "name": "University of Trento" } ] }
```

List endpoints SHOULD be pageable in future versions; keep the representation resource-oriented. ([Google Cloud][2])

### `GET /api/v1/schools/{id}`

Returns the school or `404` if not found. Resource names should remain stable identifiers. ([google.aip.dev][9])

---

## Courses

### `GET /api/v1/courses?schoolId=…`

Lists courses, optionally filtered by `schoolId`. Keep filtering parameters simple and additive. ([Google Cloud][2])

### `GET /api/v1/courses/{id}`

Returns one course by id; `404` if not found. ([RFC Editor][5])

---

## Problems

### `GET /api/v1/courses/{courseId}/problems`

Lists problems under the course. Resource nesting should reflect containment. ([google.aip.dev][9])

### `GET /api/v1/courses/{courseId}/problems/{id}`

Returns one problem; `404` if not found. Problem metadata includes language limits, code/time/memory limits, and an `artifact` JSON for judge inputs. ([Cloudflare Docs][10])

---

## Submissions

### `POST /api/v1/problems/{id}/submissions`

Creates a submission for the problem; body:

```json
{ "code": "…", "language": "cpp23" }
```

Response (201)

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

Servers enqueue an asynchronous judge task and return `201 Created` with the resource representation; failures return `500` with a problem document. ([RFC Editor][5])

### `GET /api/v1/submissions/{id}`

Returns the submission if the requester is the owner; else `403`; `404` if not found. ([RFC Editor][5])

### `GET /api/v1/users/me/submissions`

Returns the authenticated user’s submissions ordered by time descending. ([Google Cloud][2])

---

# Error Model

* All errors use RFC 7807: `type`, `title`, `status`, `detail`, `instance`; custom members are allowed for machine-readable fields (e.g., `code`). ([datatracker.ietf.org][3])
* `Content-Type: application/problem+json`; when `Accept` excludes JSON, return `406` with a problem document to explain negotiation failure. ([datatracker.ietf.org][4])
* JSON family is recognized via the `+json` structured syntax suffix, so `application/problem+json` is valid for negotiation and clients SHOULD accept it. ([datatracker.ietf.org][4], [RFC Editor][11])