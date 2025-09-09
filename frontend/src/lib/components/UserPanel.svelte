<script lang="ts">
export let user: { email: string; slug?: string } | null;
</script>

<div class="card bg-base-200">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">User</h2>
		{#if user}
			<div class="space-y-1">
				<div class="font-medium">{user.email}</div>
				{#if user.slug}<div class="text-sm opacity-70">{user.slug}</div>{/if}
			</div>
			<div class="card-actions">
				<form method="POST" action="/api/v1/auth/logout" class="w-full">
					<button class="btn btn-sm w-full" type="submit">Logout</button>
				</form>
			</div>
		{:else}
			<p class="text-sm opacity-70">You are not logged in.</p>
			<div class="card-actions">
				<a href="/login" class="btn btn-sm btn-primary w-full">Login</a>
			</div>
		{/if}
	</div>
</div>
