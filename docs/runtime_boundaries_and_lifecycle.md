# Backend/Frontend Boundaries & End-to-End Lifecycle

This document clarifies responsibilities between the **frontend (edge platform)**
and the **backend (consumer on VPS)**, and describes the end-to-end flows:
authentication (magic link), submission, judging, persistence, and deployment.

## Actors & Components

- **Client**: browser.
- **Edge Platform**: Cloudflare Pages + Pages Functions (SvelteKit adapter).
- **Database**: Cloudflare D1.
- **Queue**: Cloudflare Queues (edge produces jobs; backend pulls).
- **Email**: Resend (verified domain `oj.yifen9.li`).
- **Consumer**: Go service on a VPS (Docker container), HTTP Pull from Queues.
- **Platform API**: authenticated Pages Function endpoints used by the consumer for result ingestion (write to D1).

---

## Responsibility boundaries

### Frontend (edge platform)
- **Routing/UI** with SvelteKit.
- **Authentication** (magic link):
  - Generate one-time token (TTL, single use) for `@studenti.unitn.it`.
  - Send email via Resend.
  - Verify callback, exchange for session, set session cookie (TTL).
- **Submissions**:
  - Validate submission and persist an initial `queued` record in D1.
  - **Produce** a job message to Queues (`QUEUE`).
  - Provide immediate acknowledgment to the user and a status endpoint.
- **Result ingestion**:
  - Expose a **private Platform API** (Pages Function) that accepts result
    callbacks from the consumer. Authenticate via a shared secret/token.
  - Perform idempotent upserts in D1 (update status, score, diagnostics, timestamps).
- **Configuration**: wrangler config per project (dev/prod) and per channel (preview/production), with all non-inherited keys defined explicitly.
- **Data ownership**: **Only the platform writes to D1**. The consumer **never** holds DB credentials.

### Backend (Go consumer on VPS)
- **Queue client**:
  - HTTP Pull batches with `visibility_timeout` and `lease_id`.
  - Parallel processing; success/failed partitions per batch.
  - Batch **ack** successes; **retry** failures (optionally delayed); overflow to DLQ.
- **Judging orchestrator**:
  - Run language toolchains inside **sandboxed** sub-process/containers (resource limits, read-only FS, no network).
  - Collect stdout/stderr, timing, memory usage, exit codes.
- **Callback**:
  - POST result back to the Platform API (edge), including `submission_id`, verdict, stats, logs/artifacts if needed.
  - Retries with backoff; idempotent via `submission_id`.
- **Observability**:
  - Structured logs; counters (pulled, processed, acked, retried, failed); latency and queue age.

---

## Data contracts (essentials)

**Queue message (JSON)**
```json
{
  "submission_id": "uuid",
  "user_id": "uuid",
  "course_id": "uuid",
  "problem_id": "uuid",
  "language": "cpp|python|java|...",
  "source": "base64-encoded or stored ref",
  "limits": { "time_ms": 1000, "memory_mb": 256 },
  "trace_id": "uuid",
  "created_at": "ISO-8601"
}
````

**Result callback (JSON)**

```json
{
  "submission_id": "uuid",
  "status": "accepted|wrong_answer|time_limit|runtime_error|judging_error",
  "score": 100,
  "time_ms": 123,
  "memory_mb": 42,
  "logs": "optional truncated text",
  "artifacts": [],
  "finished_at": "ISO-8601"
}
```

Idempotency: the platform updates by `submission_id` with last-write-wins for results; duplicated callbacks are safe.

---

## End-to-end flows

### 1) Authentication (magic link)

1. User enters email `*@studenti.unitn.it`.
2. Edge generates one-time token (TTL, single use), stores hash+metadata in D1.
3. Edge sends email via Resend (deliverability: SPF/DKIM/DMARC setup).
4. User clicks link → Edge verifies token (domain allowlist, TTL, single-use), creates a session cookie.
5. Session protects subsequent routes and APIs.

### 2) Submit code

1. Authenticated user posts solution to `/courses/[courseId]/problems/[problemId]`.
2. Edge validates input, **inserts `submission` row** (`queued`), and **produces** a Queue message.
3. Edge responds immediately; UI shows `queued` and polls or uses SSE for status.

### 3) Judge

1. Consumer polls Queue, obtains a batch under a `lease_id` (`visibility_timeout` guards against duplicate processing).
2. Consumer runs the sandboxed judge; on success prepares an **ack**; on error prepares a **retry** (optional delay).
3. Consumer **acks/retries** in batch.
4. Consumer POSTs the result to the Platform API (edge), authenticated with a shared secret.
5. Edge validates and **upserts** the submission in D1 (`running` → final verdict).

### 4) Read result

* Client polls `/api/submissions/:id` or subscribes to updates; the edge serves the latest row from D1.

---

## Lifecycle: dev → prod

### Local development

* Run `wrangler pages dev` from `/frontend`; D1 `LOCAL` with migrations+seed.
* For a clean local DB: delete `frontend/.wrangler/state` then migrate+seed.
* Queues: local producers exist; dev usually uses the **real** Queue for end-to-end tests.

### Dev cloud

* **Provision** (`terraform workspace dev`): Pages project `unitn-oj-dev`, D1, Queue.
* **Inject D1 UUID**: `scripts/update-d1-id.mjs dev`.
* **Migrate & seed** (remote).
* **Deploy**: direct upload to dev Pages (`preview` or `production` channels).
* **Consumer**: deploy to VPS via `deploy/consumer/compose.yaml` + `.env`; scale by increasing replicas or instances.

### Prod cloud

* **Provision** (`terraform workspace prod`): mirror of dev resources.
* **Inject D1 UUID**: `scripts/update-d1-id.mjs prod`.
* **Migrate** only (no seeds).
* **Deploy** to `unitn-oj` Pages; bind custom domain; secrets/vars isolated from dev.
* **Consumer**: run separate stack against the prod Queue (dedicated token/credentials).

---

## Reliability & safety

* **Delivery semantics**: at-least-once; design for idempotency with `submission_id`.
* **DLQ**: messages exceeding retries go to the dead-letter queue; create a manual reprocessing tool.
* **Schema evolution**: migrations recorded in `d1_migrations`; dev reset by Terraform (destroy & apply); prod is forward-only with backups/exports.
* **Sandbox**: no network, read-only FS, CPU/memory/time limits per language toolchain.
* **Secrets**: Pages secrets via Wrangler/dashboard; consumer secrets via `.env` on the VPS (never committed).
* **Observability**:

  * Edge: request logs, queue produce failures, D1 errors.
  * Consumer: pull rate, ack/retry counts, failure reasons, processing latency, queue age.
  * Alarms: backlog thresholds, error rate spikes, email bounce/complaint metrics.

---

## Operations runbooks (common tasks)

* **Dev DB reset (cloud)**: Terraform destroy+apply D1 → update D1 UUID → migrate → seed.
* **Purge Queue (dev)**: purge then replay seeds/fixtures.
* **Rollback (frontend)**: select previous Pages deployment (preview/production).
* **Rollback (consumer)**: pin previous GHCR image tag and `docker compose up -d`.
* **Secret rotation**: rotate Pages secret and VPS `.env` token; restart consumer.