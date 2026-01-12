<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Check } from '@jis3r/icons';

	let {
		closeOnLaunch = $bindable(false),
		showSaved = false
	}: {
		closeOnLaunch: boolean;
		showSaved?: boolean;
	} = $props();
</script>

<div class="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold tracking-tight">App Behavior</h2>
		{#if showSaved}
			<span
				class="flex animate-in items-center gap-1.5 text-xs font-medium text-green-500 duration-200 fade-in"
			>
				<Check size={14} />
				Saved
			</span>
		{/if}
	</div>
	<div class="flex items-center justify-between">
		<div class="space-y-0.5">
			<Label for="close-on-launch">Close on Launch</Label>
			<p class="text-sm text-muted-foreground">Automatically close launcher after launching game</p>
		</div>
		<Switch id="close-on-launch" bind:checked={closeOnLaunch} />
	</div>
</div>
