<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { newsQueries, modQueries, NewsItem } from '$lib/queries';
	import * as Carousel from '$lib/components/ui/carousel';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
	import { useSidebar } from '$lib/sidebar.svelte';

	import NewsCard from './_components/NewsCard.svelte';
	import ModCard from './_components/ModCard.svelte';
	import NewsDetail from './_components/NewsDetail.svelte';

	const newsQuery = createQuery(newsQueries.all);
	const trendingModsQuery = createQuery(modQueries.trending);

	let selectedNews = $state<NewsItem | null>(null);

	function toggleNews(item: NewsItem) {
		if (selectedNews?.id === item.id) {
			selectedNews = null;
		} else {
			selectedNews = item;
		}
	}

	$effect(() => {
		useSidebar(selectedNews ? NewsDetailSidebar : null);
	});

	const skeletons = Array.from({ length: 3 });
</script>

{#snippet NewsDetailSidebar()}
	{#if selectedNews}
		<NewsDetail news={selectedNews} onclose={() => (selectedNews = null)} />
	{/if}
{/snippet}

<div class="scrollbar-styled @container h-full space-y-12 overflow-y-auto p-8">
	<!-- News Section -->
	<section>
		<div class="mb-6 px-10">
			<h2 class="text-2xl font-bold tracking-tight">Latest News</h2>
			<p class="text-sm text-muted-foreground">Updates from the development team.</p>
		</div>

		{#if newsQuery.isLoading}
			<div class="grid grid-cols-1 gap-6 px-10 @sm:grid-cols-2 @md:grid-cols-3">
				{#each skeletons, i (i)}
					<Skeleton class="h-72 w-full rounded-xl" />
				{/each}
			</div>
		{:else if newsQuery.isSuccess}
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-4">
					{#each newsQuery.data as newsItem (newsItem.id)}
						<Carousel.Item class="pl-4 @lg:basis-1/2 @2xl:basis-1/3">
							<NewsCard
								{newsItem}
								isSelected={selectedNews?.id === newsItem.id}
								onclick={() => toggleNews(newsItem)}
							/>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
			</Carousel.Root>
		{/if}
	</section>

	<!-- Trending Mods Section -->
	<section>
		<div class="mb-4 flex items-center justify-between px-10">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">Trending Mods</h2>
				<p class="text-sm text-muted-foreground">Most popular community creations this week.</p>
			</div>
		</div>

		{#if trendingModsQuery.isLoading}
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-2">
					{#each skeletons, i (i)}
						<Carousel.Item class="basis-full @3xl:basis-1/2 @5xl:basis-1/3">
							<Card.Root class="overflow-hidden p-0">
								<div class="flex h-40">
									<Skeleton class="h-40 w-40 shrink-0 rounded-none" />
									<div class="flex-1 space-y-3 p-3">
										<Skeleton class="h-5 w-3/4" />
										<Skeleton class="h-4 w-full" />
										<Skeleton class="mt-auto h-4 w-1/3" />
									</div>
								</div>
							</Card.Root>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
			</Carousel.Root>
		{:else if trendingModsQuery.isError}
			<div class="mx-10 rounded-md border border-destructive/20 bg-destructive/10 p-4">
				<p class="text-sm font-semibold text-destructive">Error loading mods</p>
			</div>
		{:else if trendingModsQuery.isSuccess && trendingModsQuery.data}
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-2">
					{#each trendingModsQuery.data as mod (mod.id)}
						<Carousel.Item class="basis-full pl-2 @4xl:basis-1/2 @7xl:basis-1/3">
							<ModCard {mod} />
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
			</Carousel.Root>
		{/if}
	</section>
</div>
