# Frontend Logic

**Global layout**
The app uses a global layout with a header (home + auth entry), a three-column main area, and a footer; data returned from `+layout.server.ts` is exposed to `+layout.svelte` and child pages via `data`. ([Svelte][1])
SvelteKit relies on filesystem routing (`+layout`, `+page`, `+server`) and server endpoints are implemented by exporting HTTP method handlers from `+server.ts`. ([Svelte][2])

**Routes (UI)**
`/`, `/schools`, `/schools/{school}`, `/schools/{school}/courses`, `/schools/{school}/courses/{course}`, `/schools/{school}/courses/{course}/problems/{problem}`, `/users/{slug}`, `/users/{slug}/submissions`, `/users/me`. These paths follow resource-oriented naming; human-readable slugs coexist with stable identifiers as recommended by Google’s AIP resource-name guidance. ([AIP][3])

**Authentication UX**
The login page requests a magic link via `POST /api/v1/auth/requestLink`; in production the page renders a Cloudflare Turnstile widget using **explicit rendering** (`turnstile.render(el, { sitekey, callback })`). ([Cloudflare Docs][4])
On success, the verification endpoint (`/api/v1/auth/verify`) sets a session cookie (`Set-Cookie: sid=...`) and the client refreshes session state via `GET /api/v1/users/me`. ([MDN Web Docs][5])
Cookies should be `HttpOnly`, `Secure` (HTTPS), and with an appropriate `SameSite` policy; this is the standard guidance for session cookies. ([MDN Web Docs][6])
Server-side and load functions may read cookies via SvelteKit’s `cookies.*` API; values returned from server `load` are available as `data` in layouts/pages. ([Svelte][7])

**Email delivery (production)**
Email delivery for magic links uses Resend from a Worker/Pages Function; Resend provides an official guide and API reference for Workers. ([Cloudflare Docs][8], [resend.com][9])

---

## Notes on Data Plane

Cloudflare Pages/Workers pass bindings on `env` (for example `env.DB` for D1), which you can access from handlers and server `load`; D1 queries use prepared statements with `.prepare().bind().first()/all()` as documented. ([Cloudflare Docs][10])
To make these bindings and secrets available: set **Environment variables/Secrets** in the Pages project for Production/Preview, and for local dev use `.dev.vars` so `wrangler pages dev` injects them at runtime. ([Cloudflare Docs][11])

---

## Dev vs Prod behavior

Dev can bypass Turnstile and echo a `magicUrl` for direct verification, while Prod requires a valid Turnstile `sitekey` and sends mail via Resend; ensure `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET` and `RESEND_API_KEY`/`RESEND_FROM` are configured in the target environment. ([Cloudflare Docs][12])

---

## Session lifecycle (client observable)

After verifying a token, the response sets `sid` via `Set-Cookie`, then client code invalidates data and re-loads layout/page data (e.g. calling `invalidateAll`), which reads cookies server-side and exposes `user` in `data`. ([MDN Web Docs][5], [Svelte][1])

---

## Minimal page contract

Pages read `data.user` (from `+layout.server.ts`) and render profile/logout when present, otherwise render login; this uses SvelteKit’s standard `data` propagation semantics. ([Svelte][1])

---

### Fix for `Property 'env' does not exist on type 'Readonly<Platform>'`