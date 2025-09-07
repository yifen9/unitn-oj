<script lang="ts">
import { onMount } from "svelte";

let token = "";
let err = "";
let ok = false;

onMount(() => {
	const u = new URL(window.location.href);
	token = u.searchParams.get("token") ?? "";
});

async function confirm() {
	err = "";
	const r = await fetch("/api/v1/auth/verify", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token }),
	});
	if (!r.ok) {
		const j = await r.json().catch(() => ({}));
		err = j?.error?.message ?? "Verify failed";
		return;
	}
	ok = true;
	window.location.href = "/";
}
</script>

<h1>Confirm sign-in</h1>
{#if token}
  <button on:click={confirm}>Confirm & sign in</button>
{:else}
  <p>Missing token.</p>
{/if}
{#if err}<p>{err}</p>{/if}