<script lang="ts">
  import { onMount } from 'svelte';
  let email = '';
  let sending = false;
  let message = '';
  let magicUrl: string | null = null;

  async function requestLink() {
    sending = true; message = ''; magicUrl = null;
    try {
      const res = await fetch('/api/v1/auth/requestLink', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || 'request failed');
      if (j?.data?.magicUrl) {
        magicUrl = j.data.magicUrl;
        message = 'Dev mode: Magic link is ready below.';
      } else {
        message = 'Check your email for the magic link.';
      }
    } catch (e: any) {
      message = e?.message || 'Failed to request link.';
    } finally {
      sending = false;
    }
  }
</script>

<h1>Sign in</h1>
<form on:submit|preventDefault={requestLink}>
  <label>Email</label>
  <div style="display:flex;gap:8px;margin:6px 0;">
    <input type="email" bind:value={email} placeholder="your@studenti.unitn.it" required />
    <button type="submit" disabled={sending}>Request Link</button>
  </div>
</form>

{#if message}<p>{message}</p>{/if}

{#if magicUrl}
  <p><a href={magicUrl}>Open magic link</a></p>
{/if}
