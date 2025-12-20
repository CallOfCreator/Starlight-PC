<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { newsQueries, modQueries } from '$lib/queries';
	import * as Card from '$lib/components/ui/card';
	import * as Carousel from '$lib/components/ui/carousel';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { marked } from 'marked';
	import Prose from '$lib/components/Prose.svelte';
	import { Clock, Download, User, Calendar, ArrowRight, ImageOff } from '@lucide/svelte';

	const newsQuery = createQuery(newsQueries.all);
	const trendingModsQuery = createQuery(modQueries.trending);

	const skeletons = Array.from({ length: 3 });
</script>

<div class="scrollbar-styled h-full space-y-12 overflow-y-auto p-8">
	<!-- News Section -->
	<section>
		<div class="mb-6 px-10">
			<h2 class="text-2xl font-bold tracking-tight">Latest News</h2>
			<p class="text-sm text-muted-foreground">Updates from the development team.</p>
		</div>

		{#if newsQuery.isLoading}
			<div class="grid grid-cols-1 gap-6 px-10 md:grid-cols-2 lg:grid-cols-3">
				{#each skeletons, i (i)}
					<Skeleton class="h-72 w-full rounded-xl" />
				{/each}
			</div>
		{:else if newsQuery.isSuccess}
			<Carousel.Root opts={{ align: 'start' }} class="w-full px-10">
				<Carousel.Content class="-ml-4">
					{#each newsQuery.data as newsItem (newsItem.id)}
						<Carousel.Item class="pl-4 md:basis-1/2 lg:basis-1/3">
							<Card.Root
								class="group flex h-72 flex-col transition-all hover:border-primary/50 hover:shadow-lg"
							>
								<Card.Header class="pb-3">
									<div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
										<div class="flex items-center gap-1.5">
											<User class="h-3.5 w-3.5" />
											<span class="font-medium text-foreground/80">{newsItem.author}</span>
										</div>
										<div class="flex items-center gap-1.5">
											<Calendar class="h-3.5 w-3.5" />
											{new Date(newsItem.updated_at).toLocaleDateString()}
										</div>
									</div>

									<Card.Title
										class="text-lg leading-snug transition-colors group-hover:text-primary"
									>
										{newsItem.title}
									</Card.Title>
								</Card.Header>

								<Card.Content class="relative flex-1 overflow-hidden px-6 py-0">
									<div class="prose-sm text-muted-foreground">
										<Prose content={marked(newsItem.content)} />
									</div>

									<div
										class="pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-linear-to-t from-card to-transparent"
									></div>
								</Card.Content>

								<Card.Footer class="pt-2 pb-4">
									<button
										class="group/btn flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
									>
										Read full story
										<ArrowRight
											class="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1"
										/>
									</button>
								</Card.Footer>
							</Card.Root>
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
						<Carousel.Item class="basis-full lg:basis-1/2 xl:basis-1/3">
							<Card.Root class="overflow-hidden p-0">
								<div class="flex h-40">
									<Skeleton class="h-40 w-40 shrink-0 rounded-none" />
									<div class="flex-1 space-y-3 p-3">
										<div class="space-y-1">
											<Skeleton class="h-5 w-3/4" />
											<Skeleton class="h-4 w-1/2" />
										</div>
										<div class="space-y-1">
											<Skeleton class="h-4 w-full" />
											<Skeleton class="h-4 w-full" />
											<Skeleton class="h-4 w-2/3" />
										</div>
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
						<Carousel.Item class="basis-full lg:basis-1/2 xl:basis-1/3">
							<Card.Root class="overflow-hidden p-0 transition-colors hover:bg-accent/50">
								<div class="flex h-40">
									<div class="h-40 w-40 shrink-0 bg-muted">
										{#if mod._links.thumbnail}
											<img
												src={mod._links.thumbnail}
												alt={mod.name}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<ImageOff class="h-10 w-10 text-muted-foreground/40" />
											</div>
										{/if}
									</div>

									<!-- Content Area -->
									<div class="flex min-w-0 flex-1 flex-col p-3">
										<div class="min-w-0 flex-1">
											<h3
												class="mb-0.5 truncate text-base leading-tight font-bold"
												title={mod.name}
											>
												{mod.name}
											</h3>
											<p class="mb-2 truncate text-sm text-muted-foreground/80">
												by {mod.author}
											</p>
											<p class="line-clamp-3 text-sm leading-snug text-muted-foreground">
												{mod.description}
											</p>
										</div>

										<div class="flex items-center gap-4 pt-2 text-sm font-medium">
											<div class="flex items-center gap-1.5">
												<Download class="h-4 w-4 text-primary" />
												<span>{mod.downloads.toLocaleString()}</span>
											</div>
											<div class="flex items-center gap-1.5 text-muted-foreground">
												<Clock class="h-4 w-4" />
												<span>{new Date(mod.created_at).toLocaleDateString()}</span>
											</div>
										</div>
									</div>
								</div>
							</Card.Root>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<Carousel.Previous class="-left-2" />
				<Carousel.Next class="-right-2" />
			</Carousel.Root>
		{/if}
	</section>
</div>
