<script>
import { onMount } from "svelte";
import { page } from "$app/stores";

let _problem = null;
let _submissions = [];
let code = "";
let _message = "";

$: courseId = $page.params.id;
$: problemId = $page.params.pid;

async function loadProblem() {
	const res = await fetch(`/api/v1/courses/${courseId}/problems/${problemId}`);
	const j = await res.json();
	if (j.ok) _problem = j.data;
	else _message = j.error?.message || "Failed to load problem";
}

async function loadSubmissions() {
	const res = await fetch(`/api/v1/users/me/submissions`);
	const j = await res.json();
	if (j.ok) {
		_submissions = j.data.filter((s) => s.problemId === problemId);
	}
}

async function _submitCode(e) {
	e.preventDefault();
	_message = "";
	const res = await fetch(`/api/v1/problems/${problemId}/submissions`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ code }),
	});
	const j = await res.json();
	if (j.ok) {
		_message = "Submission successful";
		code = "";
		await loadSubmissions();
	} else {
		_message = j.error?.message || "Submission failed";
	}
}

onMount(async () => {
	await loadProblem();
	await loadSubmissions();
});
</script>

{#if _problem}
  <h1>{_problem.title}</h1>
  <p>{_problem.description}</p>

  <form on:submit={_submitCode}>
    <textarea bind:value={code} rows="6" cols="60"></textarea><br />
    <button type="submit">Submit</button>
  </form>

  {#if _message}
    <p class={_message.includes('success') ? 'success' : 'error'}>{_message}</p>
  {/if}

  <h2>My Submissions</h2>
  {#if _submissions.length === 0}
    <p>No submissions yet.</p>
  {:else}
    <table border="1" cellpadding="4">
      <thead>
        <tr><th>ID</th><th>Status</th><th>Created</th></tr>
      </thead>
      <tbody>
        {#each _submissions as s}
          <tr>
            <td>
              <a href={`/api/v1/submissions/${s.submissionId}`} target="_blank" rel="noopener">
                {s.submissionId}
              </a>
            </td>
            <td>{s.status}</td>
            <td>{new Date(s.createdAt * 1000).toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:else}
  <p>Loading problem…</p>
{/if}

<style>
  .error { color: red; }
  .success { color: green; }
</style>
