<script lang="ts">
import { goto } from "$app/navigation";
export let user: { email: string; slug?: string } | null;

let submitting = false;

async function login(e: SubmitEvent) {
	e.preventDefault();
	if (submitting) return;
	submitting = true;

	const fd = new FormData(e.currentTarget as HTMLFormElement);
	const payload: Record<string, unknown> = { email: fd.get("email") };

	const res = await fetch("/api/v1/auth/requestLink", {
		method: "POST",
		headers: { "content-type": "application/json", accept: "application/json" },
		credentials: "same-origin",
		body: JSON.stringify(payload),
	});

	let token: string | undefined;
	try {
		const j: unknown = await res.json();
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
}
</script>

{#if user}
<div class="card bg-base-200">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">User</h2>
		<div class="space-y-1">
			<div class="font-medium">{user.email}</div>
			{#if user.slug}<div class="text-sm opacity-70">{user.slug}</div>{/if}
		</div>
		<div class="card-actions">
			<a href="/users/me" class="btn btn-sm btn-ghost w-full">Profile</a>
			<form method="POST" action="/api/v1/auth/logout" class="w-full">
				<button class="btn btn-sm w-full" type="submit">Logout</button>
			</form>
		</div>
	</div>
</div>
{:else}
<div class="card bg-base-200">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">Sign in</h2>
		<form class="space-y-3" on:submit={login}>
			<input name="email" type="email" required class="input input-bordered w-full" placeholder="name@studenti.unitn.it" />
			<div class="h-12 rounded-box border border-dashed border-base-300/60 grid place-items-center text-xs opacity-70">
				Turnstile disabled in dev
			</div>
			<button class="btn btn-primary w-full" disabled={submitting}>Send magic link</button>
		</form>
	</div>
</div>
{/if}
