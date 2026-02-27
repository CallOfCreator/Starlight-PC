<script lang="ts" module>
	export interface AppBehaviorSectionProps {
		saved?: boolean;
		localCloseOnLaunch: boolean;
	}
</script>

<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import SettingsSection from './SettingsSection.svelte';

	let { saved = false, localCloseOnLaunch = $bindable() }: AppBehaviorSectionProps = $props();
</script>

<SettingsSection title="App Behavior" {saved}>
	<div class="flex items-center justify-between">
		<div class="space-y-0.5">
			<Label for="close-on-launch">Close on Launch</Label>
			<p class="text-sm text-muted-foreground">Automatically close launcher after launching game</p>
		</div>
		<Switch id="close-on-launch" bind:checked={localCloseOnLaunch} />
	</div>
</SettingsSection>
