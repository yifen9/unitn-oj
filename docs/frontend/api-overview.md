# api-overview

## Versioning
- Base path: `/api/v1/`
- All responses are JSON.
- Success response:

  ```json
  { "ok": true, "data": { ... } }
  ```

* Error response:

  ```json
  { "ok": false, "error": { "code": "INVALID_ARGUMENT", "message": "..." } }
  ```

---

## Auth

### `POST /auth/requestLink`

* Input: `{ "email": "user@studenti.unitn.it" }`
* Output (dev): `{ "ok": true, "data": { "magicUrl": "..." } }`
* Output (prod): `{ "ok": true }`
* Purpose: Request a magic link to login.

### `GET /auth/verify?token=...`

* Input: token in query or POST body.
* Output: `{ "ok": true, "data": { "userId": "...", "email": "..." } }`
* Purpose: Verify token, upsert user, issue session cookie.

### `POST /auth/logout`

* Output: `{ "ok": true }`
* Purpose: Clear `sid` cookie.

---

## Users

### `GET /users/me`

* Output: `{ "ok": true, "data": { "userId": "...", "email": "..." } }`
* Purpose: Get current logged-in user.

---

## Schools

### `GET /schools`

* Output: `{ "ok": true, "data": [ { "schoolId": "...", "name": "..." } ] }`
* Purpose: List all schools.

### `GET /schools/{id}`

* Purpose: Get school detail.

---

## Courses

### `GET /courses`

* Output: list of courses, optional filter by `schoolId`.

### `GET /courses/{id}`

* Purpose: Get course detail.

---

## Problems

### `GET /courses/{courseId}/problems`

* Purpose: List problems under a course.

### `GET /courses/{courseId}/problems/{id}`

* Purpose: Get problem detail.

---

## Submissions

### `POST /problems/{id}/submissions`

* Input: `{ "code": "..." }`
* Output: submission record (status = `queued`).
* Purpose: Create a submission.

### `GET /submissions/{id}`

* Purpose: Get submission detail (must be owner).

### `GET /users/me/submissions`

* Purpose: Get current user's submissions.