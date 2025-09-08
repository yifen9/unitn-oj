# Frontend Logic

* Global layout: header with logo→`/`, auth entry that switches to profile/logout when authenticated; main 3-column; footer placeholder. SvelteKit routes are filesystem-based and components/utilities are shared via `$lib`. ([Svelte][13])
* Routes:
  `/` home or redirect to `/courses`;
  `/courses` list; `/courses/{id}` detail + problems;
  `/courses/{id}/problems/{pid}` detail + submission form + user’s recent submissions;
  `/me/submissions` list all submissions for current user. Use `+server.ts` for API endpoints. ([Svelte][14])