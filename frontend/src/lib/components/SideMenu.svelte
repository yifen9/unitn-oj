<script lang="ts">
import { derived } from "svelte/store";
import { page } from "$app/stores";

type Crumb = { label: string; href: string };

const crumbs = derived(page, ($page): Crumb[] => {
	const segs = $page.url.pathname.split("/").filter(Boolean);
	let path = "";
	return segs.map((seg) => {
		path += `/${seg}`;
		const raw = decodeURIComponent(seg).replace(/[-_]/g, " ");
		const label = raw.charAt(0).toUpperCase() + raw.slice(1);
		return { label, href: path };
	});
});
</script>

<nav aria-label="Site navigation">
	<ul class="menu menu-lg rounded-none bg-base-100 w-full">
		<li><h2 class="menu-title">Explore</h2></li>
		<li><a href="/">Home</a></li>
		<li><a href="/schools">Schools</a></li>
		<li><a href="/submissions">Submissions</a></li>

		{#if $crumbs.length}
			<li><h2 class="menu-title">Here</h2></li>
			{#each $crumbs as c}
				<li><a href={c.href}>{c.label}</a></li>
			{/each}
		{/if}
	</ul>
</nav>
