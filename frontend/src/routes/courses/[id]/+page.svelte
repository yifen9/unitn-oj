<script>
import { onMount } from "svelte";
import { page } from "$app/stores";

let course = null;
let problems = [];
let message = "";

$: courseId = $page.params.id;

async function loadCourse() {
	s;
	const res = await fetch(`/api/v1/courses/${courseId}`);
	const j = await res.json();
	if (j.ok) course = j.data;
	else message = j.error?.message || "Failed to load course";
}

async function loadProblems() {
	const res = await fetch(`/api/v1/courses/${courseId}/problems`);
	const j = await res.json();
	if (j.ok) problems = j.data;
	else message = j.error?.message || "Failed to load problems";
}

onMount(async () => {
	await loadCourse();
	await loadProblems();
});
</script>

{#if course}
  <h1>{course.name}</h1>
  <p>Course ID: {course.courseId}</p>

  <h2>Problems</h2>
  {#if problems.length === 0}
    <p>No problems available.</p>
  {:else}
    <table border="1" cellpadding="4">
      <thead>
        <tr><th>Title</th><th>Action</th></tr>
      </thead>
      <tbody>
        {#each problems as p}
          <tr>
            <td>{p.title}</td>
            <td>
              <a href={`/courses/${courseId}/problems/${p.problemId}`}>
                View Problem
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{:else}
  <p>{message || 'Loading course…'}</p>
{/if}

<style>
  .error { color: red; }
</style>
