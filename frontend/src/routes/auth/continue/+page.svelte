<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/stores";

let state: "idle" | "verifying" | "done" | "error" = "idle";

onMount(async () => {
	state = "verifying";
	const token = $page.url.searchParams.get("token") || "";
	const r = await fetch("/api/v1/auth/verify", {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json" },
		credentials: "include",
		body: JSON.stringify({ token }),
	});
	if (r.ok) {
		state = "done";
		await goto("/", { invalidateAll: true });
	} else {
		state = "error";
	}
});
</script>

<section class="prose max-w-none">
	<h1>Continue sign-in</h1>
	{#if state === "verifying"}<p>Verifying…</p>{/if}
	{#if state === "error"}<p>Something went wrong.</p>{/if}
</section>
