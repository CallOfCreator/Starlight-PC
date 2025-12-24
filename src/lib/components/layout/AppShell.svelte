<script lang="ts">
	import { NavButton } from '$lib/components/ui/nav-button';
	import { Button } from '$lib/components/ui/button';
	import { AutoBreadcrumb } from '$lib/components/ui/breadcrumb';
	import { browser } from '$app/environment';
	import { setSidebar } from '$lib/state/sidebar.svelte';
	import { default as StarlightIcon } from '$lib/assets/starlight.svg?component';
	import { ArrowLeft, ArrowRight, Settings, Compass, House, Plus } from '@jis3r/icons';
	import { Library } from '@lucide/svelte';
	import StarBackground from '$lib/components/shared/StarBackground.svelte';
	import { platform } from '@tauri-apps/plugin-os';

	let { children } = $props();
	const sidebar = setSidebar();

	// Detect platform for layout adjustments
	let platformName = $state<'macos' | 'windows' | 'linux' | 'other'>('other');

	if (browser && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
		const osType = platform();
		if (osType === 'macos') platformName = 'macos';
		else if (osType === 'windows') platformName = 'windows';
		else platformName = 'linux';
	}

	function handleTransitionEnd(e: TransitionEvent) {
		if (e.propertyName === 'grid-template-columns' && !sidebar.isOpen) {
			sidebar.finalizeClose();
		}
	}
</script>

<div
	class="app-shell relative isolate grid h-screen auto-rows-[auto_1fr] grid-cols-[auto_1fr] overflow-hidden bg-card
		[--left-bar-width:4rem] [--right-bar-width:300px] [--top-bar-height:3rem]
		[grid-template-areas:'status_status'_'nav_dummy']"
>
	<!-- Star background -->
	<div class="star-container pointer-events-none absolute inset-0 z-5 opacity-80">
		<StarBackground />
	</div>

	<!-- Top Status Bar -->
	<div
		data-tauri-drag-region
		class="relative z-10 flex h-(--top-bar-height) items-center bg-card/80 [grid-area:status]
			{platformName === 'macos' ? 'pl-[75px]' : ''}
			{platformName === 'windows' ? 'pr-[135px]' : ''}"
	>
		<!-- Left Side: Logo/Brand -->
		<div data-tauri-drag-region class="flex items-center gap-2 p-5">
			<StarlightIcon class="h-6 w-6" />
		</div>

		<!-- Center-Left: Navigation Controls -->
		<div data-tauri-drag-region class="flex items-center gap-1">
			<div
				data-tauri-drag-region-exclude
				class="mr-4 flex items-center gap-1 rounded-full bg-border"
			>
				<Button variant="navigation" aria-label="Go back" onclick={() => history.back()}>
					<ArrowLeft />
				</Button>
				<Button variant="navigation" aria-label="Go forward" onclick={() => history.forward()}>
					<ArrowRight />
				</Button>
			</div>
			<AutoBreadcrumb homeIcon={House} maxItems={4} />
		</div>

		<!-- Right Side: Spacer for Windows controls or additional tools -->
		<div data-tauri-drag-region class="ml-auto flex h-full items-center px-4">
			<!-- You can put global search or profile here, it will sit to the left of Windows buttons -->
		</div>
	</div>

	<!-- Left Navigation Bar -->
	<nav
		class="relative z-10 flex w-(--left-bar-width) flex-col gap-2 overflow-visible bg-card/80 p-2 pt-0 [grid-area:nav]"
	>
		<NavButton to="/" isPrimary={(page) => page.url.pathname === '/'} tooltip="Home">
			<House class="h-6 w-6" />
		</NavButton>
		<NavButton
			to="/explore"
			isPrimary={(page) => page.url.pathname.startsWith('/explore')}
			tooltip="Explore Mods"
		>
			<Compass class="h-6 w-6" />
		</NavButton>
		<NavButton
			to="/library"
			isPrimary={(page) => page.url.pathname.startsWith('/library')}
			tooltip="Your Library"
		>
			<Library class="h-6 w-6" />
		</NavButton>
		<div class="mx-auto my-2 h-px w-6 bg-accent"></div>
		<NavButton to="/new" tooltip="Create New">
			<Plus class="h-6 w-6" />
		</NavButton>
		<div class="flex grow"></div>
		<NavButton
			to="/settings"
			isPrimary={(page) => page.url.pathname.startsWith('/settings')}
			tooltip="Settings"
		>
			<Settings class="h-6 w-6" />
		</NavButton>
	</nav>

	<!-- Main Content Area -->
	<div
		class="absolute inset-0 top-(--top-bar-height) left-(--left-bar-width) z-1 grid h-[calc(100vh-var(--top-bar-height))] overflow-hidden rounded-tl-xl bg-background
			transition-[grid-template-columns] duration-400 ease-in-out
			{sidebar.isOpen ? 'grid-cols-[1fr_var(--right-bar-width)]' : 'grid-cols-[1fr_0px]'}"
		ontransitionend={handleTransitionEnd}
	>
		<div class="relative h-full grow overflow-hidden">
			<div
				id="background-teleport-target"
				class="absolute -z-10 h-full w-[calc(100%-var(--right-bar-width))] overflow-hidden rounded-tl-xl"
			></div>
			{@render children?.()}
		</div>

		<!-- Right Sidebar -->
		<div
			class="app-sidebar relative mt-px flex shrink-0 flex-col overflow-visible border-l border-border bg-muted"
			style="width: var(--right-bar-width);"
		>
			<div class="relative grow overflow-y-auto pb-12">
				{#if sidebar.content}
					{@render sidebar.content()}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	[data-tauri-drag-region] {
		-webkit-app-region: drag;
	}
	[data-tauri-drag-region-exclude] {
		-webkit-app-region: no-drag;
	}

	.star-container {
		clip-path: polygon(
			0 0,
			100vw 0,
			100vw var(--top-bar-height),
			var(--left-bar-width) var(--top-bar-height),
			var(--left-bar-width) 100vh,
			0 100vh
		);
	}

	.app-shell::after {
		content: '';
		position: fixed;
		z-index: 2;
		pointer-events: none;
		inset: var(--top-bar-height) 0 0 var(--left-bar-width);
		border-radius: var(--radius-xl) 0 0 0;
		box-shadow:
			inset 1px 1px 15px rgba(0, 0, 0, 0.1),
			inset 1px 1px 1px rgba(255, 255, 255, 0.1);
	}
</style>
