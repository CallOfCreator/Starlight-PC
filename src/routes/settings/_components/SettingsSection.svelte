<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface SettingsSectionProps {
		title: string;
		saved?: boolean;
		children?: Snippet;
		class?: string;
	}
</script>

<script lang="ts">
	import { Check } from '@jis3r/icons';
	import { cn } from '$lib/utils';

	let { title, saved = false, children, class: className }: SettingsSectionProps = $props();
</script>

<section class={cn('rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm', className)}>
	<header class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold tracking-tight">{title}</h2>
		{#if saved}
			<span
				class="flex animate-in items-center gap-1.5 text-xs font-medium text-green-500 duration-200 fade-in"
			>
				<Check size={14} /> Saved
			</span>
		{/if}
	</header>

	{#if children}
		{@render children()}
	{/if}
</section>
