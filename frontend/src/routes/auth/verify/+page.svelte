<script lang="ts">
import { onMount } from "svelte";
import { goto, invalidateAll } from "$app/navigation";

onMount(async () => {
	const token = new URL(location.href).searchParams.get("token") || "";
	if (!token) {
		await goto("/login");
		return;
	}
	await fetch("/api/v1/auth/verify", {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json" },
		credentials: "same-origin",
		body: JSON.stringify({ token }),
	});
	await invalidateAll();
	await goto("/");
});
</script>

<section class="prose max-w-none">
	<h1>Verify</h1>
	<p>Signing you in…</p>
</section>
