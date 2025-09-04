<script lang="ts">
const state = { email: "" };
let _sending = false;
let _message = "";
let _magicUrl: string | null = null;

async function _requestLink() {
	_sending = true;
	_message = "";
	_magicUrl = null;
	try {
		const res = await fetch("/api/v1/auth/requestLink", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ email: state.email }),
		});
		const j = await res.json();
		if (!res.ok) throw new Error(j?.error?.message || "request failed");
		if (j?.data?.magicUrl) {
			_magicUrl = j.data.magicUrl;
			_message = "Dev mode: Magic link is ready below.";
		} else {
			_message = "Check your email for the magic link.";
		}
	} catch (e: any) {
		_message = e?.message || "Failed to request link.";
	} finally {
		_sending = false;
	}
}
</script>

<h1>Sign in</h1>
<form on:submit|preventDefault={_requestLink}>
  <label for="email">Email</label>
  <div style="display:flex;gap:8px;margin:6px 0;">
    <input id="email" type="email" bind:value={state.email} placeholder="your@studenti.unitn.it" required />
    <button type="submit" disabled={_sending}>Request Link</button>
  </div>
</form>

{#if _message}<p>{_message}</p>{/if}

{#if _magicUrl}
  <p><a href={_magicUrl}>Open magic link</a></p>
{/if}
