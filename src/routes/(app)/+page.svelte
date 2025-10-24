<script lang="ts">
    import { createQuery } from "@tanstack/svelte-query";
    import { fetchNews, type NewsItem } from "$lib/queries";
    import * as Card from "$lib/components/ui/card";
    import * as Carousel from "$lib/components/ui/carousel";
    import { marked } from "marked";
    import Prose from "$lib/components/Prose.svelte";
    import { StarlightIcon } from "$lib/components/icons";

    const newsQuery = createQuery(() => ({
        queryKey: ["news"],
        queryFn: () => fetchNews(),
    }));
</script>

<div class="p-8">
    <h1
        class="text-4xl font-bold mb-6 text-center flex items-center justify-center gap-3"
    >
        Welcome to Starlight!
        <StarlightIcon class="w-10 h-10" />
    </h1>

    <!-- News Section -->
    <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold flex items-center gap-2">News</h2>
        </div>

        {#if newsQuery.isLoading}
            <p class="text-gray-500">Loading news...</p>
        {:else if newsQuery.isError}
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-red-600 font-semibold">Error loading news</p>
                <p class="text-red-500 text-sm mt-1">
                    {newsQuery.error?.message}
                </p>
            </div>
        {:else if newsQuery.isSuccess && newsQuery.data}
            <Carousel.Root
                opts={{
                    align: "start",
                }}
                class="w-full maw-w-sm"
            >
                <Carousel.Content>
                    {#each newsQuery.data as newsItem: NewsItem (newsItem.id)}
                        <Carousel.Item class="md:basis-1/2 lg:basis-1/3">
                            <Card.Root class="flex flex-col h-96">
                                <Card.Content
                                    class="flex-1 overflow-hidden hover:overflow-y-auto scrollbar-styled"
                                >
                                    <Prose content={marked(newsItem.content)} />
                                </Card.Content>
                                <Card.Footer
                                    class="text-xs flex items-end justify-between border-t border-border"
                                >
                                    <div class="flex flex-col gap-0.5">
                                        <div
                                            class="font-semibold text-sm text-card-foreground"
                                        >
                                            {newsItem.title}
                                        </div>
                                        <div class="text-muted-foreground">
                                            {newsItem.author}
                                        </div>
                                    </div>
                                    <div class="text-muted-foreground">
                                        {new Date(
                                            newsItem.updated_at,
                                        ).toLocaleDateString()}
                                    </div>
                                </Card.Footer>
                            </Card.Root>
                        </Carousel.Item>
                    {/each}
                </Carousel.Content>
            </Carousel.Root>
        {/if}
    </div>
</div>
