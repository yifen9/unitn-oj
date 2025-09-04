<script lang="ts">
export let data: {
	courseId: string;
	problems: { problemId: string; title: string }[];
};
</script>

<h1>Problems</h1>
<p>Course: <strong>{data.courseId}</strong></p>

{#if data.problems.length === 0}
  <p>No problems for this course.</p>
{:else}
  <ul>
    {#each data.problems as p}
      <li>
        <a href={`/courses/${encodeURIComponent(data.courseId)}/problems/${encodeURIComponent(p.problemId)}`}>{p.title}</a>
        <small style="margin-left:8px;">[{p.problemId}]</small>
      </li>
    {/each}
  </ul>
{/if}

<p><a href="/courses">Back to Courses</a></p>
