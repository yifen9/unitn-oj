<script lang="ts">
  export let data: { user: { email: string } | null }
</script>

<h1>My submissions</h1>
{#if data.user}
  <p>Submissions list will appear here in F4.</p>
{:else}
  <p>You are not signed in.</p>
  <p><a href="/login">Go to Sign in</a></p>
{/if}
<p><a href="/me">Back to My profile</a></p>
