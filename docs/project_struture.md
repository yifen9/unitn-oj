# UNITN OJ — Project Structure & Conventions

This document describes the monorepo layout, responsibilities of each top-level
directory, environment strategy, and the core workflows (local dev, dev cloud,
production). It is the single source of truth for how the repository is
organized and how we work with it.

## High-level goals

- Ship a Cloudflare-first Online Judge (OJ) for University of Trento students.
- Strict separation of concerns:
  - **Frontend (edge)**: SvelteKit on Cloudflare Pages + Pages Functions, D1, Queues (producer), email.
  - **Backend (compute)**: stateless **Go** consumer pulling jobs from Cloudflare Queues on a self-hosted VPS, running sandboxed judging, and calling back the platform API.
- Everything is **reproducible**: Infrastructure as Code (Terraform), deterministic builds, containerized runtime.

---

## Monorepo layout

```

/frontend/                      # SvelteKit app + edge logic (Pages Functions)
  d1/                           # schema, migrations, seeds (D1)
  src/                          # SvelteKit sources
  wrangler.jsonc                # local dev config (Pages dev, LOCAL D1)
  package.json                  # app scripts (build/dev), no repo-wide lint here

/backend/
  /consumer/                    # Go HTTP Pull consumer (independent go module)
    cmd/consumer/               # main() entrypoint
    internal/queues/            # Cloudflare Queues pull/ack/retry client
    internal/runner/            # judging orchestrator (spawn process/container)
    internal/ingest/            # callback client → Platform API (edge) to write D1
    configs/                    # non-secret configs (batch size, visibility timeout)
    Dockerfile                  # multi-stage, minimal runtime image
go.mod, go.sum, .dockerignore

/deploy/
  /cloudflare/
    /dev/                       # wrangler.jsonc (Pages project: unitn-oj-dev)
    /prod/                      # wrangler.jsonc (Pages project: unitn-oj)
  /consumer/
    compose.yaml                # VPS docker-compose (image, env\_file, healthcheck)
    .env.example                # non-secret reference variables

/infra/
  /terraform/                   # CF resources (Pages, D1, Queues), workspaces dev/prod
    \*.tf, dev.tfvars, prod.tfvars

/docs/

/scripts/                       # repo-wide automation (Node scripts)
  update-d1-id.mjs              # injects D1 UUID into wrangler.jsonc (dev/prod)
(add others: purge queue, health checks, etc.)

/tests/
  frontend/                     # Vitest projects for UI/edge code
  backend/                      # consumer contract tests (Go/Node-driven)
  e2e/                          # end-to-end (browser→edge→queue→consumer→D1)

/.devcontainer/                 # VS Code Dev Container
/.github/                        # CI workflows

pnpm-workspace.yaml             # monorepo package discovery
package.json                    # root scripts (format/lint/test/build/deploy/etc.)
biome.json                      # monorepo-wide formatting/linting policy
vitest.config.ts                # (root) test runner config

```

**Naming & path conventions**

- Cloudflare Pages supports two named environments only: `preview` and `production`.
  All non-inherited keys (`vars`, `d1_databases`, `queues`) MUST be defined in both
  blocks under each `deploy/cloudflare/<env>/wrangler.jsonc`.
- Business environment is indicated by `APP_ENV=dev|prod` **inside** each Pages
  project (e.g., both `preview` and `production` of `unitn-oj-dev` carry `APP_ENV=dev`).

---

## Toolchain

- **Package manager**: `pnpm` (workspace; use `--filter ./frontend` to scope commands).
- **Frontend**: SvelteKit + Vite + TypeScript; Cloudflare adapter.
- **Edge runtime**: Cloudflare Pages Functions with Wrangler.
- **DB**: Cloudflare D1 (SQLite semantics).
- **Queue**: Cloudflare Queues (producer at edge, HTTP Pull consumer on VPS).
- **Email**: Resend (noreply@oj.yifen9.li), verified sending domain.
- **Infra**: Terraform (Pages projects, D1, Queues); workspaces `dev` and `prod`.
- **Containers**: Docker (DevContainer locally; Docker Compose on VPS for consumer).
- **Lint/format**: Biome at repo root.
- **Tests**: Vitest projects; e2e contracts in `/tests`.

---

## Environments

- **Local**: `frontend/wrangler.jsonc` with `d1_databases: LOCAL`, `.dev.vars` for local env vars.
- **Dev (Cloud)**: Pages project `unitn-oj-dev` with `preview/production` channels. Uses real D1 and Queues. DB is (re)created by Terraform; migrations and seeds via Wrangler.
- **Prod (Cloud)**: Pages project `unitn-oj` with `preview/production`. Migrations forward-only, no seeds.

---

## Core workflows

### Local development
- `pnpm --filter ./frontend dev` → `wrangler pages dev` (build + local runtime).
- Local DB bootstrap: `pnpm --filter ./frontend db:apply && db:seed`.
- Local reset: remove `frontend/.wrangler/state` then migrate + seed again.

### Dev cloud init & deploy
- `pnpm tf:apply:dev` → creates/updates Pages/D1/Queues.
- `pnpm gen:wrangler:dev` → inject D1 UUID into `deploy/cloudflare/dev/wrangler.jsonc`.
- `pnpm db:migrate:dev && pnpm db:seed:dev` (remote).
- `pnpm pages:deploy:dev:preview` or `:prod`.

### Prod cloud init & deploy
- Same as dev but using `prod` workspace and `deploy/cloudflare/prod/...`.
- No seeding; migrations must be idempotent and forward-only.
- Pages production deploy is controlled by the project’s `production_branch` and the `--branch` supplied.

---

## Configuration & Secrets

- **Edge** (Pages Functions): non-secret `vars` in wrangler config; **secrets** with Wrangler or dashboard; duplicate keys per `preview/production`.
- **Consumer** (VPS): `.env` for CF account id, queue id/name, token, callback secret; never commit.
- **Automation**: `scripts/update-d1-id.mjs` reads TF outputs and updates wrangler config; writes backups to the OS temp dir.

---

## Testing strategy

- Unit tests in `/tests/frontend` and `/tests/backend`.
- Contract tests in `/docs/contracts` (schemata + fixtures) and `/tests/e2e` to exercise the full path: browser → edge → queue → consumer → D1.

---

## Release & rollback

- Frontend: Pages supports deployments per commit; roll back by selecting a previous deployment (preview or production).
- Consumer: images published to GHCR with `<semver>-<gitsha>` tags; VPS updates via `docker compose pull && up -d`; rollback by pinning the previous tag.