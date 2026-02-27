<script lang="ts" module>
	export interface ProfileModsToolbarProps {
		searchPlaceholder: string;
		searchInput: string;
		onInstallMods: () => void;
	}
</script>

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { SearchIcon, X, Plus } from '@lucide/svelte';

	let { searchPlaceholder, searchInput = $bindable(), onInstallMods }: ProfileModsToolbarProps =
		$props();
</script>

<div class="mx-auto mb-5 flex w-full max-w-3xl justify-center gap-3">
	<div class="relative flex-1">
		<SearchIcon class="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/70" />
		<Input
			placeholder={searchPlaceholder}
			bind:value={searchInput}
			class="h-10 w-full rounded-xl border bg-accent/50 pr-10 pl-10"
		/>
		{#if searchInput}
			<button onclick={() => (searchInput = '')} class="absolute top-1/2 right-3 -translate-y-1/2">
				<X class="size-4" />
			</button>
		{/if}
	</div>

	<Button size="lg" class="flex items-center gap-2" onclick={onInstallMods}>
		<Plus class="size-5" />
		<span>Install Mods</span>
	</Button>
</div>
