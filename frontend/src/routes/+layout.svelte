<script lang="ts">
import "../app.css";
import SideMenu from "$lib/components/SideMenu.svelte";
import UserPanel from "$lib/components/UserPanel.svelte";
</script>

<header class="navbar fixed top-0 inset-x-0 z-50 h-14 bg-base-100 border-b border-base-300/60">
	<div class="navbar-start">
		<a href="/" class="btn btn-ghost text-lg font-semibold">unitn-oj</a>
	</div>
	<div class="navbar-end gap-2">
		<a href="/login" class="btn btn-sm btn-primary">Login</a>
	</div>
</header>

<div class="pt-14 min-h-dvh bg-base-100 text-base-content">
	<div class="w-full">
		<div class="grid grid-cols-1 lg:grid-cols-12 divide-x divide-base-300/60">
			<aside class="hidden lg:block lg:col-span-2">
				<div class="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto">
					<SideMenu />
				</div>
			</aside>

			<main class="lg:col-span-8 p-6 min-h-[60dvh]">
				<slot />
			</main>

			<aside class="hidden lg:block lg:col-span-2">
				<div class="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto p-4">
					<UserPanel />
				</div>
			</aside>
		</div>
	</div>
</div>

<footer class="border-t border-base-300/60 bg-base-100">
	<div class="px-4 py-6 text-sm opacity-70">footer placeholder</div>
</footer>
