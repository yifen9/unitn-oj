<script lang="ts">
export let data: { user: { email: string } | null };
</script>

<h1>My profile</h1>
{#if data.user}
  <p>Signed in as <strong>{data.user.email}</strong>.</p>
  <p><a href="/me/submissions">Go to My Submissions</a></p>
{:else}
  <p>You are not signed in.</p>
  <p><a href="/login">Go to Sign in</a></p>
{/if}
<p><a href="/">Back to Home</a></p>
