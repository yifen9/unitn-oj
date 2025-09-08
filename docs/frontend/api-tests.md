# Testing Strategy

* Test framework: Vitest with Vite/SvelteKit integration so that `$lib` aliasing and generated route types behave as in runtime. ([sqlitetutorial.net][12])
* Unit tests per handler cover: success, input validation errors (`415` for non-JSON, `400` for bad payload), auth errors (`401`/`403`), not found (`404`), and generic `5xx` for dependency failures; problems are asserted as RFC 7807. ([RFC Editor][5], [datatracker.ietf.org][3])
* Health tests specifically assert `GET/HEAD` semantics, `Cache-Control: no-store`, content negotiation to `406`, and `traceparent` propagation or generation. ([RFC Editor][5], [W3C][6])

**Auth tests**
`requestLink`: 415 wrong content-type; 400 invalid JSON; 400 invalid domain; 200 dev returns `magicUrl`; 500 DB error. ([RFC Editor][5])
`verify`: 400 missing token; 401 not found/expired; 200 success sets cookie; 500 DB error. ([RFC Editor][5])
`logout`: 200 clears cookie; prod includes `Secure`. ([RFC Editor][5])

**Users**
`me`: 401 missing/invalid session; 200 success; 500 DB throws. ([RFC Editor][5])

**Schools/Courses/Problems**
`list`: 200 success; 500 DB error. `get`: 200/404/500 DB error. ([RFC Editor][5])

**Submissions**
`create`: 400 code missing; 401 missing/invalid session; 201 queued; 500 DB/queue error. `get`: 400 id missing; 401; 404; 403 not owner; 200 success; 500 DB. ([RFC Editor][5])