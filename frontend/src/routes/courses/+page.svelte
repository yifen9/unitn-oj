<script lang="ts">
  export let data: { courses: { courseId: string; schoolId: string; name: string }[]; schoolId: string }
  let schoolId = data.schoolId
  function applyFilter() {
    const p = new URL(location.href)
    if (schoolId) p.searchParams.set('schoolId', schoolId)
    else p.searchParams.delete('schoolId')
    location.href = p.toString()
  }
</script>

<h1>Courses</h1>

<div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
  <input placeholder="Filter by schoolId (optional)" bind:value={schoolId} />
  <button on:click={applyFilter}>Apply</button>
</div>

{#if data.courses.length === 0}
  <p>No courses found.</p>
{:else}
  <ul>
    {#each data.courses as c}
      <li>
        <a href={`/courses/${encodeURIComponent(c.courseId)}/problems`}>{c.name}</a>
        <small style="margin-left:8px;">[{c.courseId}] · {c.schoolId}</small>
      </li>
    {/each}
  </ul>
{/if}

<p><a href="/">Back to Home</a></p>
