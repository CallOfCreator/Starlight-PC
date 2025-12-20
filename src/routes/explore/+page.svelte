<script lang="ts">
	import { useSidebar } from '$lib/sidebar.svelte';

	// Set custom sidebar content for the explore page
	useSidebar(ExploreSidebar);
	const placeholders = Array.from({ length: 6 }, (_, i) => i);
</script>

{#snippet ExploreSidebar()}
	<div class="border-b border-border p-4">
		<h3 class="m-0 text-base font-medium text-primary">Explore Filters</h3>
		<p class="mt-2 text-sm text-muted-foreground">Find the perfect mod</p>
	</div>
	<div class="p-4">
		<h3 class="mb-2 text-sm font-medium">Categories</h3>
		<div class="space-y-2 text-sm">
			<label class="flex items-center gap-2">
				<input type="checkbox" class="rounded" />
				<span>Roles</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="rounded" />
				<span>Maps</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="rounded" />
				<span>Gamemodes</span>
			</label>
		</div>
	</div>
	<div class="border-t border-border p-4">
		<h3 class="mb-2 text-sm font-medium">Among Us Version</h3>
		<select class="w-full rounded border border-border bg-background px-2 py-1 text-sm">
			<option>All Versions</option>
			<option>1.20.x</option>
			<option>1.19.x</option>
			<option>1.18.x</option>
		</select>
	</div>
{/snippet}

<div class="p-8">
	<h1 class="mb-6 text-4xl font-bold">Explore Mods</h1>

	<div class="mb-6">
		<input
			type="search"
			placeholder="Search mods..."
			class="w-full max-w-md rounded-lg border border-border bg-background px-4 py-2"
		/>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each placeholders as i (i)}
			<div class="rounded-lg border border-border p-4 transition-colors hover:bg-accent/50">
				<div class="mb-3 aspect-video rounded bg-accent"></div>
				<h3 class="mb-1 font-semibold">Mod {i + 1}</h3>
				<p class="text-sm text-muted-foreground">A sample mod description</p>
			</div>
		{/each}
	</div>
</div>
