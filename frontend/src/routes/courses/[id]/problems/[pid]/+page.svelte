<script lang="ts">
  export let data: { problem: { problemId: string; courseId: string; title: string; description?: string | null } }
</script>

<h1>{data.problem.title}</h1>
<p>Problem ID: <strong>{data.problem.problemId}</strong></p>
<p>Course: <strong>{data.problem.courseId}</strong></p>

{#if data.problem.description}
  <pre style="white-space:pre-wrap;">{data.problem.description}</pre>
{:else}
  <p>No description.</p>
{/if}

<p>
  <a href={`/courses/${encodeURIComponent(data.problem.courseId)}/problems`}>Back to Problems</a>
</p>
