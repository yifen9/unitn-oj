<script lang="ts">
import { onMount } from "svelte";
import { goto, invalidateAll } from "$app/navigation";

let _status = "Verifying...";

async function run(token: string) {
	try {
		const url = `/api/v1/auth/verify?token=${encodeURIComponent(token)}`;
		const res = await fetch(url, { credentials: "same-origin" });
		const j = await res.json();
		if (!res.ok || !j?.ok)
			throw new Error(j?.error?.message || "verify failed");
		_status = "Success. Redirecting...";
		await invalidateAll();
		await goto("/");
	} catch (e: any) {
		_status = e?.message || "Verification failed.";
	}
}

onMount(() => {
	const t = new URL(location.href).searchParams.get("token") || "";
	if (t) run(t);
	else _status = "Missing token.";
});
</script>

<h1>Verify</h1>
<p>{_status}</p>