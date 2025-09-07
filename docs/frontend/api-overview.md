# API Overview

> Version: v1 (base path: `/api/v1/`)

All responses are JSON.

Success

```json
{ "ok": true, "data": { /* payload */ } }
```

Error

```json
{ "ok": false, "error": { "code": "INVALID_ARGUMENT", "message": "..." } }
```

## Error Codes

`INVALID_ARGUMENT` · `FAILED_PRECONDITION` · `UNAUTHENTICATED` · `PERMISSION_DENIED` · `NOT_FOUND` · `RESOURCE_EXHAUSTED` · `INTERNAL`

## HTTP Status

* 200 OK – Successful read or non-creating action
* 201 Created – Resource created (e.g. submission)
* 401 Unauthorized – Missing/invalid `sid`
* 403 Forbidden – Authenticated but not allowed (e.g. not owner)
* 404 Not Found – Resource does not exist
* 415 Unsupported Media Type – JSON required
* 5xx – Server-side errors (prod only leaks generic message)

## Authentication

* Session cookie: `sid`

  * Attributes: `HttpOnly; Path=/; SameSite=Lax; Max-Age=<env>;` plus `Secure` in production
* Allowed email domain: `@studenti.unitn.it`
* In dev, magic link is returned in the response; in prod it is sent via email

---

## Auth

### POST `/auth/requestLink`

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

Purpose: Request a magic link to sign in.

### GET `/auth/verify?token=...`

* Input: `token` in query (or POST body)
* Output

```json
{ "ok": true, "data": { "userId": "u_...", "email": "user@studenti.unitn.it" } }
```

Purpose: Verify token, upsert user, issue `sid` cookie.

### POST `/auth/logout`

Output

```json
{ "ok": true }
```

Purpose: Clear `sid` cookie.

---

## Users

### GET `/users/me`

Output

```json
{ "ok": true, "data": { "userId": "u_...", "email": "..." } }
```

Purpose: Return the current authenticated user.

---

## Schools

### GET `/schools`

Output

```json
{ "ok": true, "data": [ { "schoolId": "unitn", "name": "University of Trento" } ] }
```

Purpose: List all schools.

### GET `/schools/{id}`

Purpose: Get a school by id.

---

## Courses

### GET `/courses`

Purpose: List courses. Optional filter by `schoolId`.

### GET `/courses/{id}`

Purpose: Get a course by id.

---

## Problems

### GET `/courses/{courseId}/problems`

Purpose: List problems under a course.

### GET `/courses/{courseId}/problems/{id}`

Purpose: Get problem detail.

---

## Submissions

### POST `/problems/{id}/submissions`

Input

```json
{ "code": "..." }
```

Output (201)

```json
{
  "ok": true,
  "data": {
    "submissionId": "s_...",
    "userId": "u_...",
    "problemId": "...",
    "status": "queued",
    "createdAt": 1736272000
  }
}
```

Purpose: Create a submission (enqueued for judging).

### GET `/submissions/{id}`

Purpose: Get submission detail (must be owner).

### GET `/users/me/submissions`

Purpose: List the current user’s submissions (newest first).