<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { goto } from "$app/navigation";
export let data: {
	requiresAuth: boolean;
	submissions: {
		submissionId: string;
		userId: string;
		problemId: string;
		status: string;
		createdAt: number;
	}[];
};

let items = data.submissions;
let ticking: number | null = null;
const intervalMs = 7000;
let loading = false;
let errorMsg = "";

async function reload() {
	loading = true;
	errorMsg = "";
	try {
		const res = await fetch("/api/v1/users/me/submissions", {
			credentials: "same-origin",
		});
		if (res.status === 401) {
			await goto("/login");
			return;
		}
		const j = await res.json();
		if (!res.ok || !j?.ok)
			throw new Error(j?.error?.message || "Reload failed");
		items = j.data;
	} catch (e: any) {
		errorMsg = e?.message || "Reload failed";
	} finally {
		loading = false;
	}
}

onMount(() => {
	if (!data.requiresAuth)
		ticking = setInterval(reload, intervalMs) as unknown as number;
});
onDestroy(() => {
	if (ticking) clearInterval(ticking as unknown as number);
});

function fmt(ts: number) {
	try {
		return new Date(ts * 1000).toISOString();
	} catch {
		return String(ts);
	}
}
</script>

<h1>My submissions</h1>

{#if data.requiresAuth}
  <p>You are not signed in.</p>
  <p><a href="/login">Go to Sign in</a></p>
{:else}
  <div style="margin:8px 0;">
    <button on:click={reload} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
  </div>

  {#if errorMsg}<p>{errorMsg}</p>{/if}

  {#if items.length === 0}
    <p>No submissions yet.</p>
  {:else}
    <table border="1" cellpadding="6">
      <thead>
        <tr><th>Created</th><th>Submission</th><th>Problem</th><th>Status</th></tr>
      </thead>
      <tbody>
        {#each items as s}
          <tr>
            <td>{fmt(s.createdAt)}</td>
            <td><a href={`/api/v1/submissions/${encodeURIComponent(s.submissionId)}`} rel="external">{s.submissionId}</a></td>
            <td>{s.problemId}</td>
            <td>{s.status}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <p style="margin-top:8px;"><a href="/courses">Go to Courses</a></p>
{/if}
