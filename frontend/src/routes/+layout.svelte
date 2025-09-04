<script lang="ts">
import "../lib/styles/base.scss";
export let data: { user: { userId: string; email: string } | null };

import { goto } from "$app/navigation";

async function _signOut() {
	await fetch("/api/v1/auth/logout", {
		method: "POST",
		credentials: "same-origin",
	});
	await goto("/");
}
</script>

<div class="app">
  <header class="header">
    <nav style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <a href="/" aria-label="home">OJ</a>
      {#if data.user}
        <div style="display:flex;gap:10px;align-items:center;">
          <a href="/me">Profile</a>
          <form method="post" action="/api/v1/auth/logout">
            <button on:click={signOut}>Sign out</button>
          </form>
        </div>
      {:else}
        <div style="display:flex;gap:10px;align-items:center;">
          <a href="/login">Login</a>
          <a href="/login">Register</a>
        </div>
      {/if}
    </nav>
  </header>

  <main class="main">
    <aside class="left">
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="/">Home</a>
        <a href="/courses">Courses</a>
        {#if data.user}<a href="/me/submissions">Submissions</a>{/if}
      </div>
    </aside>

    <section class="center">
      <slot />
    </section>

    <aside class="right">
      {#if data.user}
        <div>
          <div>Signed</div>
          <div style="word-break:break-all;">{data.user.email}</div>
        </div>
      {:else}
        <div>Unsigned</div>
      {/if}
    </aside>
  </main>

  <footer class="footer">
    <div>footer</div>
  </footer>
</div>
