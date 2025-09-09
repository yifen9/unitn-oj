<script lang="ts">
import { goto } from "$app/navigation";
export let data: { sitekey: string };
let submitting = false;

async function submit(e: SubmitEvent) {
	e.preventDefault();
	if (submitting) return;
	submitting = true;

	const fd = new FormData(e.currentTarget as HTMLFormElement);
	const payload: Record<string, unknown> = { email: fd.get("email") };
	const t = fd.get("cf-turnstile-response");
	if (t) payload["cf-turnstile-response"] = t;

	const r = await fetch("/api/v1/auth/requestLink", {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json" },
		credentials: "same-origin",
		body: JSON.stringify(payload),
	});

	let token: string | undefined;
	try {
		const j: unknown = await r.json();
		if (j && typeof j === "object" && "data" in j) {
			const d = (j as { data?: unknown }).data;
			if (d && typeof d === "object" && "magicUrl" in d) {
				const m = (d as { magicUrl?: unknown }).magicUrl;
				if (typeof m === "string") {
					const u = new URL(m, location.origin);
					token = u.searchParams.get("token") || undefined;
				}
			}
		}
	} catch {}

	if (token) {
		await goto(`/auth/verify?token=${encodeURIComponent(token)}`);
		return;
	}
	location.href = "/login?sent=1";
}
</script>

<section class="min-h-[calc(100dvh-3.5rem)] grid place-items-center">
	<div class="w-full max-w-sm">
		<form class="space-y-4" on:submit={submit}>
			<input name="email" type="email" required class="input input-bordered w-full" placeholder="name@studenti.unitn.it" />
			{#if data.sitekey}
				<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
				<div class="cf-turnstile" data-sitekey={data.sitekey}></div>
			{:else}
				<div class="h-12 rounded-box border border-dashed border-base-300/60 grid place-items-center text-xs opacity-70">
					Turnstile disabled in dev
				</div>
			{/if}
			<button class="btn btn-primary w-full" disabled={submitting}>Send magic link</button>
		</form>
	</div>
</section>
