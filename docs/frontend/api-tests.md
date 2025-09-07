# API Tests

## Principles

* Framework: Vitest
* Style: unit-level per handler
* Goal: cover success + error branches for MVP endpoints

## Auth

`requestLink`

* 415 wrong content-type
* 400 invalid JSON
* 400 invalid domain
* 200 dev returns `magicUrl`
* 500 DB insert error (prod only)

`verify`

* 400 token missing
* 401 token not found
* 401 token expired
* 200 success, cookie set
* 500 DB error (prod only)

`logout`

* 200 dev (cookie cleared, no `Secure`)
* 200 prod (cookie cleared, includes `Secure`)

## Users

`me`

* 401 sid missing/invalid
* 200 with valid session
* 500 DB throws (prod only)

## Schools

`list`

* 200 success
* 500 DB error (prod only)

`get`

* 200 found
* 404 not found
* 500 DB error (prod only)

## Courses

`list`

* 200 success
* 500 DB error (prod only)

`get`

* 200 found
* 404 not found
* 500 DB error (prod only)

## Problems

`list`

* 200 success
* 500 DB error (prod only)

`get`

* 200 found
* 404 not found
* 500 DB error (prod only)

## Submissions

`create`

* 400 code missing
* 401 sid missing/invalid
* 201 success (queued)
* 500 DB error (prod only)
* 500 queue error (prod only)

`get`

* 400 id missing
* 401 sid missing/invalid
* 404 not found
* 403 not owner
* 200 success
* 500 DB error (prod only)

`list (me)`

* 401 sid missing/invalid
* 200 success
* 500 DB error (prod only)