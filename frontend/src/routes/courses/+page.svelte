<script>
import { onMount } from "svelte";

let _courses = [];
let _message = "";

async function loadCourses() {
	const res = await fetch("/api/v1/courses");
	const j = await res.json();
	if (j.ok) _courses = j.data;
	else _message = j.error?.message || "Failed to load courses";
}

onMount(loadCourses);
</script>

<h1>Courses</h1>

{#if message}
  <p class="error">{message}</p>
{:else if courses.length === 0}
  <p>No courses available.</p>
{:else}
  <table border="1" cellpadding="4">
    <thead>
      <tr><th>Name</th><th>Action</th></tr>
    </thead>
    <tbody>
      {#each courses as c}
        <tr>
          <td>{c.name}</td>
          <td>
            <a href={`/courses/${c.courseId}`}>View Course</a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .error { color: red; }
</style>
