<script lang="ts">
const user = null as { name: string; email: string } | null;
</script>

<div class="card bg-base-200">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">User</h2>
		{#if user}
			<div class="space-y-1">
				<div class="font-medium">{user.name}</div>
				<div class="text-sm opacity-70">{user.email}</div>
			</div>
			<div class="card-actions">
				<a href="/logout" class="btn btn-sm w-full">Logout</a>
			</div>
		{:else}
			<p class="text-sm opacity-70">You are not logged in.</p>
			<div class="card-actions">
				<a href="/login" class="btn btn-sm btn-primary w-full">Login</a>
			</div>
		{/if}
	</div>
</div>
