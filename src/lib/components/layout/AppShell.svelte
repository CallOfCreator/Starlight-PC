<script lang="ts">
	import { NavButton } from '$lib/components/ui/nav-button';
	import { Button } from '$lib/components/ui/button';
	import { AutoBreadcrumb } from '$lib/components/ui/breadcrumb';
	import { TitlebarButtons } from '$lib/components/ui/titlebar-buttons';
	import { browser } from '$app/environment';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { default as StarlightIcon } from '$lib/assets/starlight.svg?component';
	import { ArrowLeft, ArrowRight, Settings, Compass, House, Plus } from '@jis3r/icons';
	import { Library } from '@lucide/svelte';
	import StarBackground from '$lib/components/StarBackground.svelte';

	// Custom labels for breadcrumbs
	const breadcrumbLabels = {
		'/': 'Home',
		'/explore': 'Explore',
		'/library': 'Library',
		'/settings': 'Settings',
		'/new': 'Create New'
	};

	let { children } = $props();

	// Sidebar content management
	let sidebarContent = $state<Snippet | null>(null);

	// Derived state: sidebar is visible when content exists
	const isSidebarVisible = $derived(sidebarContent !== null);

	// Provide context for child pages to set sidebar content
	setContext('sidebar', {
		setContent: (content: Snippet | null) => {
			sidebarContent = content;
		}
	});

	const isTauri =
		browser &&
		typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !==
			'undefined';
</script>

<div class="app-grid-layout relative overflow-hidden">
	<!-- Shared star background for topbar and navbar -->
	<div class="star-container">
		<StarBackground />
	</div>

	<!-- Top Status Bar -->
	<div
		data-tauri-drag-region
		class="app-grid-statusbar relative flex h-(--top-bar-height) bg-card/80"
	>
		<div data-tauri-drag-region class="relative z-10 flex items-center gap-2 p-5">
			<StarlightIcon class="h-6 w-6" />
		</div>
		<div data-tauri-drag-region class="relative z-10 flex items-center gap-1">
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
			<AutoBreadcrumb labels={breadcrumbLabels} homeIcon={House} maxItems={4} />
		</div>
		{#if isTauri}
			<section data-tauri-drag-region class="relative z-10 ml-auto flex items-center">
				<div class="mr-3 flex"></div>
				<TitlebarButtons />
			</section>
		{/if}
	</div>

	<!-- Left Navigation Bar -->
	<nav
		class="app-grid-navbar relative flex w-(--left-bar-width) flex-col gap-2 bg-card/80 p-2 pt-0"
	>
		<NavButton to="/" isPrimary={(page) => page.url.pathname === '/'}>
			<House class="h-6 w-6" />
		</NavButton>
		<NavButton to="/explore" isPrimary={(page) => page.url.pathname.startsWith('/explore')}>
			<Compass class="h-6 w-6" />
		</NavButton>
		<NavButton to="/library" isPrimary={(page) => page.url.pathname.startsWith('/library')}>
			<Library class="h-6 w-6" />
		</NavButton>
		<div class="mx-auto my-2 h-px w-6 bg-accent"></div>
		<NavButton to="/new">
			<Plus class="h-6 w-6" />
		</NavButton>
		<div class="flex grow"></div>
		<NavButton to="/settings" isPrimary={(page) => page.url.pathname.startsWith('/settings')}>
			<Settings class="h-6 w-6" />
		</NavButton>
	</nav>
</div>

<!-- Main Content Area with Sidebar -->
<div class="app-contents overflow-hidden" class:sidebar-enabled={isSidebarVisible}>
	<div class="app-viewport grow">
		<div
			class="loading-indicator-container fixed z-50 h-8"
			style="top: var(--top-bar-height); left: var(--left-bar-width); width: calc(100% - var(--left-bar-width) - var(--right-bar-width));"
		>
			<!-- Loading indicator -->
		</div>
		<div
			id="background-teleport-target"
			class="absolute -z-10 h-full overflow-hidden rounded-tl-xl"
			style="width: calc(100% - var(--right-bar-width));"
		></div>
		{@render children?.()}
	</div>

	<!-- Right Sidebar -->
	<div class="app-sidebar mt-px flex shrink-0 flex-col overflow-auto border-l border-border">
		<div class="relative grow overflow-y-auto pb-12">
			{#if sidebarContent}
				{@render sidebarContent()}
			{/if}
		</div>
	</div>
</div>

<style>
	/* App Layout Styles */
	.app-grid-layout,
	.app-contents {
		--top-bar-height: 3rem;
		--left-bar-width: 4rem;
		--right-bar-width: 300px;
	}

	.app-grid-layout {
		display: grid;
		grid-template: 'status status' 'nav dummy';
		grid-template-columns: auto 1fr;
		grid-template-rows: auto 1fr;
		position: relative;
		background-color: var(--card);
		height: 100vh;
		overflow: hidden;
		isolation: isolate;
	}

	.app-grid-navbar {
		grid-area: nav;
		overflow: visible;
		position: relative;
		z-index: 10;
	}

	.app-grid-statusbar {
		grid-area: status;
		overflow: visible;
		position: relative;
		z-index: 10;
	}

	/* Star background positioning */
	.star-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 5;
		pointer-events: none;
		opacity: 0.8;
		clip-path: polygon(
			0 0,
			100vw 0,
			100vw var(--top-bar-height),
			var(--left-bar-width) var(--top-bar-height),
			var(--left-bar-width) 100vh,
			0 100vh
		);
	}

	[data-tauri-drag-region] {
		-webkit-app-region: drag;
	}

	[data-tauri-drag-region-exclude] {
		-webkit-app-region: no-drag;
	}

	.app-contents {
		position: absolute;
		z-index: 1;
		left: var(--left-bar-width);
		top: var(--top-bar-height);
		right: 0;
		bottom: 0;
		height: calc(100vh - var(--top-bar-height));
		background-color: var(--background);
		border-top-left-radius: var(--radius-xl);
		display: grid;
		grid-template-columns: 1fr 0px;
		transition: grid-template-columns 0.4s ease-in-out;
		overflow: hidden;
	}

	.app-contents.sidebar-enabled {
		grid-template-columns: 1fr 300px;
	}

	.loading-indicator-container {
		border-top-left-radius: var(--radius-xl);
		overflow: hidden;
	}

	.app-sidebar {
		overflow: visible;
		width: 300px;
		position: relative;
		height: calc(100vh - var(--top-bar-height));
		background: var(--muted);
	}

	.app-sidebar::before {
		content: '';
		box-shadow: -15px 0 15px -15px rgba(0, 0, 0, 0.2) inset;
		top: 0;
		bottom: 0;
		left: -2rem;
		width: 2rem;
		position: absolute;
		pointer-events: none;
	}

	.app-viewport {
		flex-grow: 1;
		height: 100%;
		overflow: hidden;
	}

	.app-contents::before {
		z-index: 1;
		content: '';
		position: fixed;
		left: var(--left-bar-width);
		top: var(--top-bar-height);
		right: calc(-1 * var(--left-bar-width));
		bottom: calc(-1 * var(--left-bar-width));
		border-radius: var(--radius-xl);
		box-shadow:
			1px 1px 15px rgba(0, 0, 0, 0.2) inset,
			inset 1px 1px 1px rgba(255, 255, 255, 0.23);
		pointer-events: none;
	}
</style>
