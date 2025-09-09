# Testing Strategy

* Tests are written with Vitest against SvelteKit `+server` handlers so `$lib` aliasing and runtime types match production behavior. ([svelte.dev][12])
* Each handler has unit tests covering: success, input validation (`415` for non-JSON, `400` for bad payload), `401/403` auth errors, `404` not found, and `5xx` dependency failures. Error bodies are asserted as RFC 9457 problem documents. ([datatracker.ietf.org][2])
* Health tests assert `GET/HEAD` semantics, `Cache-Control: no-store`, content negotiation (`406`), and `traceparent` propagation/generation per W3C Trace Context. ([W3C][7])