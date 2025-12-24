<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { newsQueries } from '$lib/features/news/queries';
	import { modQueries } from '$lib/features/mods/queries';
	import type { Post } from '$lib/features/news/schema';
	import * as Carousel from '$lib/components/ui/carousel';
	import { getSidebar } from '$lib/state/sidebar.svelte';

	import NewsCard from '$lib/features/news/components/NewsCard.svelte';
	import ModCard from '$lib/features/mods/components/ModCard.svelte';
	import NewsDetail from '$lib/features/news/components/NewsDetail.svelte';
	import NewsCardSkeleton from '$lib/features/news/components/NewsCardSkeleton.svelte';
	import ModCardSkeleton from '$lib/features/mods/components/ModCardSkeleton.svelte';

	const newsQuery = createQuery(newsQueries.all);
	const trendingModsQuery = createQuery(modQueries.trending);

	const sidebar = getSidebar();

	let selectedPost = $state<Post | null>(null);
	let displayedPost = $state<Post | null>(null);

	function toggleNews(item: Post) {
		if (selectedPost?.id === item.id) {
			selectedPost = null;
			sidebar.close();
		} else {
			selectedPost = item;
			displayedPost = item;
			sidebar.open(NewsDetailSidebar, () => {
				displayedPost = null;
			});
		}
	}

	function closeSidebar() {
		selectedPost = null;
		sidebar.close();
	}

	const skeletons = Array.from({ length: 3 });
</script>

{#snippet NewsDetailSidebar()}
	{#if displayedPost}
		<NewsDetail post={displayedPost} onclose={closeSidebar} />
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
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-4">
					{#each skeletons, i (i)}
						<Carousel.Item class="pl-4 @lg:basis-1/2 @2xl:basis-1/3">
							<NewsCardSkeleton />
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
			</Carousel.Root>
		{:else if newsQuery.isError}
			<div class="mx-10 rounded-md border border-destructive/20 bg-destructive/10 p-4">
				<p class="text-sm font-semibold text-destructive">Error loading posts</p>
			</div>
		{:else if newsQuery.isSuccess && newsQuery.data}
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-4">
					{#each newsQuery.data as post (post.id)}
						<Carousel.Item class="pl-4 @lg:basis-1/2 @2xl:basis-1/3">
							<NewsCard
								{post}
								isSelected={selectedPost?.id === post.id}
								onclick={() => toggleNews(post)}
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
						<Carousel.Item class="basis-full pl-2 @4xl:basis-1/2 @7xl:basis-1/3">
							<ModCardSkeleton />
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
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
						<Carousel.Item class="basis-full pl-2 @4xl:basis-1/2 @7xl:basis-1/3">
							<ModCardSkeleton />
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
			</Carousel.Root>
		{/if}
	</section>
</div>
