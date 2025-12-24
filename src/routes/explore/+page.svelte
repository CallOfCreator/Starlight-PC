<script lang="ts">
	import { modQueries } from '$lib/features/mods/queries';
	import { modRegistry } from '$lib/features/mods/registry.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import ModCard from '$lib/features/mods/components/ModCard.svelte';

	import { Input } from '$lib/components/ui/input';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Search, ArrowUpDown, X } from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';

	// --- State ---
	let searchInput = $state('');
	let debouncedSearch = $state('');
	let sortBy = $state<SortKey>('downloads');

	// --- Debounce ---
	$effect(() => {
		const value = searchInput;
		const timer = setTimeout(() => (debouncedSearch = value), 300);
		return () => clearTimeout(timer);
	});

	// --- Queries ---
	const totalCountQuery = createQuery(() => modQueries.total());
	const modsQuery = createQuery(() => ({
		...modQueries.explore(debouncedSearch),
		placeholderData: (prev) => prev
	}));

	// Sync to registry
	$effect(() => {
		if (modsQuery.data) modRegistry.addMany(modsQuery.data);
	});

	// --- Sort ---
	type Mod = NonNullable<typeof modsQuery.data>[number];
	type SortKey = 'downloads' | 'updated' | 'created' | 'alpha';

	const sortOptions: { value: SortKey; label: string }[] = [
		{ value: 'downloads', label: 'Most Popular' },
		{ value: 'updated', label: 'Recently Updated' },
		{ value: 'created', label: 'Newest Releases' },
		{ value: 'alpha', label: 'Alphabetical (A-Z)' }
	];

	const sortFns: Record<SortKey, (a: Mod, b: Mod) => number> = {
		downloads: (a, b) => b.downloads - a.downloads,
		updated: (a, b) => b.updated_at - a.updated_at,
		created: (a, b) => b.created_at - a.created_at,
		alpha: (a, b) => a.name.localeCompare(b.name)
	};

	// --- Derived ---
	const displayedMods = $derived.by(() => {
		const query = debouncedSearch.trim().toLowerCase();

		// Merge registry + fresh query data
		const merged = new SvelteMap(modRegistry.all.map((m) => [m.id, m]));
		modsQuery.data?.forEach((m) => merged.set(m.id, m));

		let mods = Array.from(merged.values());

		if (query) {
			mods = mods.filter(
				(m) => m.name.toLowerCase().includes(query) || m.author.toLowerCase().includes(query)
			);
		}

		return mods.sort(sortFns[sortBy]);
	});

	const showSkeletons = $derived(modsQuery.isPending && modRegistry.size === 0);
	const skeletons = Array.from({ length: 6 });
	const searchPlaceholder = $derived(
		totalCountQuery.data === undefined
			? 'Search mods...'
			: `Search ${totalCountQuery.data.toLocaleString()} mods...`
	);
</script>

<div class="scrollbar-styled @container h-full overflow-y-auto bg-background/50">
	<div class="mx-auto flex max-w-7xl flex-col gap-8 p-6 @lg:p-10">
		<header class="flex flex-col gap-6 @lg:flex-row @lg:items-center @lg:justify-between">
			<div class="space-y-1.5">
				<div class="flex items-baseline gap-3">
					<h1 class="text-4xl font-black tracking-tight">Explore</h1>
				</div>
				<p class="text-sm text-muted-foreground">Discover and manage mods for Among Us.</p>
			</div>

			<div class="flex items-center gap-3 self-end @lg:self-center">
				<div class="relative max-w-xs">
					<Search
						class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70
               {modsQuery.isFetching ? 'animate-pulse' : ''}"
					/>
					<Input
						placeholder={searchPlaceholder}
						bind:value={searchInput}
						class="h-10 w-full rounded-full border-muted-foreground/10 bg-muted/50 pr-10 pl-10 transition-colors focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
					/>
					{#if searchInput}
						<button
							type="button"
							onclick={() => (searchInput = '')}
							class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<X class="size-3.5" />
						</button>
					{/if}
				</div>

				<div class="relative w-48 shrink-0 @md:w-60">
					<ArrowUpDown
						class="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/70"
					/>

					<NativeSelect.Root
						bind:value={sortBy}
						class="h-10 w-full rounded-full border-muted-foreground/10 bg-muted/50 pr-8 pl-10 text-xs font-semibold tracking-wider uppercase transition-colors focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
					>
						{#each sortOptions as option (option.value)}
							<NativeSelect.Option value={option.value}>
								{option.label}
							</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>
			</div>
		</header>

		<main class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			{#if showSkeletons}
				{#each skeletons, i (i)}
					<div class="flex h-40 gap-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
						<Skeleton class="h-full w-40 rounded-none" />
						<div class="flex flex-1 flex-col space-y-3 p-4">
							<Skeleton class="h-6 w-3/4" />
							<Skeleton class="h-4 w-1/2" />
							<div class="space-y-2 pt-2">
								<Skeleton class="h-3 w-full" />
								<Skeleton class="h-3 w-full" />
							</div>
						</div>
					</div>
				{/each}
			{:else if displayedMods.length === 0}
				<div
					class="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/10 bg-muted/5 py-32 text-center"
				>
					<div class="mb-4 flex size-20 items-center justify-center rounded-full bg-muted">
						<Search class="size-10 text-muted-foreground/40" />
					</div>
					<h3 class="text-xl font-bold">No mods found</h3>
					<p class="mb-6 max-w-xs text-sm text-muted-foreground">
						We couldn't find any mods matching "{debouncedSearch}". Try a different term.
					</p>
					<Button variant="outline" class="rounded-full px-8" onclick={() => (searchInput = '')}>
						Clear search
					</Button>
				</div>
			{:else}
				{#each displayedMods as mod (mod.id)}
					<a href="/mods/{mod.id}" class="transition-transform active:scale-[0.98]">
						<ModCard {mod} />
					</a>
				{/each}
			{/if}
		</main>
	</div>
</div>
