<script lang="ts">
import { goto } from "$app/navigation";

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

<section class="prose max-w-none">
	<h1>Login</h1>
	<form class="space-y-4 max-w-sm" on:submit={submit}>
		<input name="email" type="email" required class="input input-bordered w-full" placeholder="name@studenti.unitn.it" />
		<div class="h-12 rounded-box border border-dashed border-base-300/60 grid place-items-center text-xs opacity-70">
			Turnstile disabled in dev
		</div>
		<button class="btn btn-primary w-full" disabled={submitting}>Send magic link</button>
	</form>
</section>
