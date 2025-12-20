<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Prose from '$lib/components/Prose.svelte';
	import { marked } from 'marked';
	import { ArrowRight } from '@jis3r/icons';
	import { User, Calendar } from '@lucide/svelte';

	let { newsItem, isSelected, onclick } = $props();
</script>

<Card.Root
	{onclick}
	class="group flex h-72 cursor-pointer flex-col transition-all hover:border-primary/50 hover:shadow-lg {isSelected
		? 'border-primary ring-1 ring-primary'
		: ''}"
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

		<Card.Title class="text-lg leading-snug transition-colors group-hover:text-primary">
			{newsItem.title}
		</Card.Title>
	</Card.Header>

	<Card.Content class="relative line-clamp-4 flex-1 overflow-hidden px-6 py-0 text-sm">
		<div class="pointer-events-none prose-sm text-muted-foreground">
			<Prose content={marked(newsItem.content)} />
		</div>
		<div
			class="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-linear-to-t from-card to-transparent"
		></div>
	</Card.Content>

	<Card.Footer class="pt-2 pb-4">
		<div
			class="group/btn flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
		>
			Read full story
			<ArrowRight />
		</div>
	</Card.Footer>
</Card.Root>
