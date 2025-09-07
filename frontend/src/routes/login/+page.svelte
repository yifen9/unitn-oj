<script lang="ts">
const email = "";
let turnstileToken = "";
let sending = false,
	message = "",
	magicUrl: string | null = null;

async function requestLink() {
	sending = true;
	message = "";
	magicUrl = null;

	const body = { email, turnstileToken };

	const res = await fetch("/api/v1/auth/requestLink", {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "same-origin",
		body: JSON.stringify(body),
	});
	const j = await res.json().catch(() => ({}));
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

function onTurnstileSuccess(token: string) {
	turnstileToken = token;
}
</script>

<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>

<h1>Sign in</h1>
<div class="login-form">
  <input type="email" bind:value={email} placeholder="your@studenti.unitn.it" required />
  <div id="turnstile-widget"></div>
  <button on:click|preventDefault={requestLink} disabled={sending}>Request Link</button>
</div>

{#if message}<p>{message}</p>{/if}
{#if magicUrl}<p><a href={magicUrl}>Open magic link</a></p>{/if}

<svelte:window on:load={() => {
  window.turnstile?.render('#turnstile-widget', {
    sitekey: 'YOUR_TURNSTILE_SITE_KEY',
    callback: onTurnstileSuccess
  });
}} />
