<script lang="ts">
  import { goto } from '$app/navigation'
  export let data: { problem: { problemId: string; courseId: string; title: string; description?: string | null } }

  let code = ''
  let sending = false
  let message = ''

  async function submitCode() {
    message = ''
    if (!code.trim()) { message = 'Code is required.'; return }
    sending = true
    try {
      const res = await fetch(`/api/v1/problems/${encodeURIComponent(data.problem.problemId)}/submissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code })
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 401) { await goto('/login'); return }
      if (!res.ok || !j?.ok) throw new Error(j?.error?.message || 'Submit failed')
      await goto('/me/submissions')
    } catch (e: any) {
      message = e?.message || 'Submit failed'
    } finally {
      sending = false
    }
  }
</script>

<h1>{data.problem.title}</h1>
<p>Problem ID: <strong>{data.problem.problemId}</strong></p>
<p>Course: <strong>{data.problem.courseId}</strong></p>

{#if data.problem.description}
  <pre style="white-space:pre-wrap;">{data.problem.description}</pre>
{:else}
  <p>No description.</p>
{/if}

<h2>Submit</h2>
<form on:submit|preventDefault={submitCode}>
  <textarea bind:value={code} rows="8" cols="80" placeholder="Paste your code here"></textarea>
  <div style="margin-top:8px;">
    <button type="submit" disabled={sending}>Submit</button>
  </div>
</form>

{#if message}<p>{message}</p>{/if}

<p>
  <a href={`/courses/${encodeURIComponent(data.problem.courseId)}/problems`}>Back to Problems</a>
</p>