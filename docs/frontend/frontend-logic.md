# Frontend Logic

* Global layout: header with home link and auth entry (switches to profile/logout when authenticated), three-column main, footer placeholder. SvelteKit uses filesystem routes and `+server` endpoints for API handlers. ([svelte.dev][12])
* Routes (UI):

  * `/` home
  * `/schools` (list) → `/schools/{school}` (detail) → `/schools/{school}/courses` (list)
  * `/schools/{school}/courses/{course}` (detail) → problems list
  * `/schools/{school}/courses/{course}/problems/{problem}` (detail + submit)
  * `/users/{slug}` (profile) and `/users/{slug}/submissions`
  * `/users/me` (session probe)

  These mirror the discovery (slug) and stable addressing (id) duality in the API. ([aip.dev][1])

---

## Notes on Data Plane

The platform uses Cloudflare Pages/Workers with D1 bindings (`env.DB`) and prepared statements (`prepare`/`bind`/`first`/`all`), aligned with Cloudflare’s Worker Binding API. ([Cloudflare Docs][11])