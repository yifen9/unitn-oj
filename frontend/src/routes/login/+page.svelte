<script lang="ts">
import { onMount } from "svelte";

const email = "";
let turnstileToken = "";
let sending = false;
let message = "";
let magicUrl: string | null = null;

async function requestLink() {
	sending = true;
	message = "";
	magicUrl = null;
	const res = await fetch("/api/v1/auth/requestLink", {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify({ email, turnstileToken }),
	});
	const j = await res.json().catch(() => ({}) as any);
	if (!res.ok) {
		message = j?.error?.message || "request failed";
		sending = false;
		return;
	}
	if (j?.data?.magicUrl) {
		magicUrl = j.data.magicUrl;
		message = "Dev mode: Magic link is ready below.";
	} else {
		message = "Check your email for the magic link.";
	}
	sending = false;
}

onMount(() => {
	const render = () => {
		(window as any).turnstile?.render("#turnstile-widget", {
			sitekey: "0x4AAAAAABubm1BqOdDseIMZ",
			callback: (t: string) => {
				turnstileToken = t;
			},
		});
	};
	if ((window as any).turnstile) {
		render();
	} else {
		const s = document.createElement("script");
		s.src =
			"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
		s.defer = true;
		s.onload = render;
		document.head.appendChild(s);
	}
});
</script>

<h1>Sign in</h1>
<div style="display:flex;flex-direction:column;gap:8px;max-width:420px">
  <input type="email" bind:value={email} placeholder="your@studenti.unitn.it" required />
  <div id="turnstile-widget"></div>
  <button on:click|preventDefault={requestLink} disabled={sending || !turnstileToken}>Request Link</button>
</div>

{#if message}<p>{message}</p>{/if}
{#if magicUrl}<p><a href={magicUrl}>Open magic link</a></p>{/if}
