<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import PageHeader from '$lib/components/shared/PageHeader.svelte';
	import { Settings, RefreshCw, Download, Trash2, Check } from '@jis3r/icons';
	import { Github, Heart, ExternalLink } from '@lucide/svelte';
	import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { settingsQueries } from '$lib/features/settings/queries';
	import { settingsMutations } from '$lib/features/settings/mutations';
	import { settingsService } from '$lib/features/settings/settings-service';
	import type { AppSettings, GamePlatform } from '$lib/features/settings/schema';
	import { showError, showSuccess } from '$lib/utils/toast';
	import { invoke } from '@tauri-apps/api/core';
	import { exists } from '@tauri-apps/plugin-fs';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { open as openDialog } from '@tauri-apps/plugin-dialog';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { getVersion } from '@tauri-apps/api/app';
	import { error as logError } from '@tauri-apps/plugin-log';
	import { epicService } from '$lib/features/settings/epic-service';
	import EpicLoginDialog from '$lib/features/settings/EpicLoginDialog.svelte';
	import type { BepInExProgress } from '$lib/features/profiles/schema';
	import { Debounced, watch } from 'runed';

	const GITHUB_URL = 'https://github.com/All-Of-Us-Mods/Starlight-PC';

	const queryClient = useQueryClient();
	const settingsQuery = createQuery(() => settingsQueries.get());
	const settings = $derived(settingsQuery.data as AppSettings | undefined);
	const updateMutation = createMutation(() => settingsMutations.update(queryClient));

	// Form state
	let localPath = $state('');
	let localUrl = $state('');
	let localPlatform = $state<GamePlatform>('steam');
	let localCacheBepInEx = $state(false);
	let localCloseOnLaunch = $state(false);

	// UI state
	let initialized = $state(false);
	let skipFirstSave = $state(true);
	let pathError = $state('');
	let isLoggedIn = $state(false);
	let isCacheExists = $state(false);
	let isDetecting = $state(false);
	let epicLoginOpen = $state(false);
	let isCacheDownloading = $state(false);
	let cacheDownloadProgress = $state(0);

	// Saved indicators (keyed by section)
	let saved = $state<Record<string, boolean>>({ game: false, bepinex: false, app: false });
	let savedTimeouts: Record<string, ReturnType<typeof setTimeout>> = {};

	// Debounced values
	const debouncedPath = new Debounced(() => localPath, 500);
	const debouncedUrl = new Debounced(() => localUrl, 500);

	// Stars for about section
	const stars = Array.from({ length: 24 }, (_, i) => ({
		left: `${(i * 17 + 7) % 100}%`,
		top: `${(i * 23 + 11) % 100}%`,
		size: (i % 3) + 1,
		delay: `${(i * 0.15) % 2}s`,
		duration: `${2 + (i % 3)}s`
	}));

	function showSaved(section: 'game' | 'bepinex' | 'app') {
		if (savedTimeouts[section]) clearTimeout(savedTimeouts[section]);
		saved[section] = true;
		savedTimeouts[section] = setTimeout(() => (saved[section] = false), 2000);
	}

	async function validatePath(path: string): Promise<boolean> {
		if (!path) return ((pathError = ''), true);
		if (!(await exists(`${path}/Among Us.exe`))) {
			pathError = 'Selected folder does not contain Among Us.exe';
			return false;
		}
		return ((pathError = ''), true);
	}

	async function saveGameConfig() {
		if (pathError) return;
		try {
			await updateMutation.mutateAsync({ among_us_path: localPath, game_platform: localPlatform });
			const newUrl = await settingsService.autoDetectBepInExArchitecture(localPath);
			if (newUrl) localUrl = newUrl;
			showSaved('game');
		} catch (e) {
			showError(e);
		}
	}

	async function saveBepInExConfig() {
		try {
			await updateMutation.mutateAsync({ bepinex_url: localUrl, cache_bepinex: localCacheBepInEx });
			showSaved('bepinex');
		} catch (e) {
			showError(e);
		}
	}

	async function saveAppBehavior() {
		try {
			await updateMutation.mutateAsync({ close_on_launch: localCloseOnLaunch });
			showSaved('app');
		} catch (e) {
			showError(e);
		}
	}

	async function detectPlatform(path: string) {
		try {
			localPlatform = (await invoke<string>('get_game_platform', { path })) as GamePlatform;
		} catch (e) {
			logError(`Platform detection failed: ${e}`);
		}
	}

	async function handleAutoDetect() {
		isDetecting = true;
		try {
			const path = await invoke<string | null>('detect_among_us');
			if (path) {
				localPath = path;
				await detectPlatform(path);
				showSuccess('Among Us path detected successfully');
			} else {
				showError('Could not auto-detect Among Us installation');
			}
		} catch (e) {
			showError(e);
		} finally {
			isDetecting = false;
		}
	}

	async function handleBrowse() {
		try {
			const selected = await openDialog({
				directory: true,
				multiple: false,
				title: 'Select Among Us Installation Folder'
			});
			if (selected) {
				localPath = selected;
				await detectPlatform(selected);
			}
		} catch (e) {
			showError(e);
		}
	}

	async function handleDownloadToCache() {
		if (!localUrl) return showError('BepInEx URL is required');
		isCacheDownloading = true;
		cacheDownloadProgress = 0;
		let unlisten: UnlistenFn | undefined;
		try {
			unlisten = await listen<BepInExProgress>('bepinex-progress', (e) => {
				cacheDownloadProgress = e.payload.progress;
			});
			const cachePath = await settingsService.getBepInExCachePath();
			await invoke('download_bepinex_to_cache', { url: localUrl, cachePath });
			isCacheExists = true;
			showSuccess('BepInEx downloaded to cache');
		} catch (e) {
			showError(e);
		} finally {
			unlisten?.();
			isCacheDownloading = false;
			cacheDownloadProgress = 0;
		}
	}

	async function handleClearCache() {
		try {
			await invoke('clear_bepinex_cache', {
				cachePath: await settingsService.getBepInExCachePath()
			});
			isCacheExists = false;
			showSuccess('Cache cleared');
		} catch (e) {
			showError(e);
		}
	}

	// Initialize state from settings
	$effect(() => {
		if (settings && !initialized) {
			localPath = settings.among_us_path ?? '';
			localUrl = settings.bepinex_url ?? '';
			localCloseOnLaunch = settings.close_on_launch ?? false;
			localPlatform = settings.game_platform ?? 'steam';
			localCacheBepInEx = settings.cache_bepinex ?? false;
			epicService.isLoggedIn().then((v) => (isLoggedIn = v));
			settingsService.getBepInExCachePath().then(async (p) => {
				isCacheExists = await invoke<boolean>('check_bepinex_cache_exists', { cachePath: p });
			});
			initialized = true;
			setTimeout(() => (skipFirstSave = false), 600);
		}
	});

	// Clear xbox_app_id when path/platform changes
	watch(
		[() => localPath, () => localPlatform],
		() => {
			if (!skipFirstSave && settings?.xbox_app_id) {
				updateMutation.mutateAsync({ xbox_app_id: undefined });
			}
		},
		{ lazy: true }
	);

	// Auto-save watchers
	watch(
		() => debouncedPath.current,
		(p) => {
			if (!skipFirstSave) {
				validatePath(p).then((ok) => {
					if (ok) saveGameConfig();
				});
			}
		},
		{ lazy: true }
	);
	watch(
		() => localPlatform,
		() => {
			if (!skipFirstSave) saveGameConfig();
		},
		{ lazy: true }
	);
	watch(
		() => debouncedUrl.current,
		() => {
			if (!skipFirstSave) saveBepInExConfig();
		},
		{ lazy: true }
	);
	watch(
		() => localCacheBepInEx,
		() => {
			if (!skipFirstSave) saveBepInExConfig();
		},
		{ lazy: true }
	);
	watch(
		() => localCloseOnLaunch,
		() => {
			if (!skipFirstSave) saveAppBehavior();
		},
		{ lazy: true }
	);
</script>

<div class="scrollbar-styled h-full overflow-y-auto px-10 py-8">
	<PageHeader
		title="Settings"
		description="Configure your Among Us path and app preferences."
		icon={Settings}
	/>

	{#if settingsQuery.isPending}
		<div class="grid max-w-4xl gap-6 lg:grid-cols-2">
			{#each [1, 2, 3] as i (i)}
				<div
					class="space-y-4 rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm"
					style="animation: pulse 2s ease-in-out infinite; animation-delay: {i * 150}ms"
				>
					<Skeleton class="h-5 w-1/3" />
					<Skeleton class="h-10 w-full" />
					<Skeleton class="h-4 w-2/3" />
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid max-w-4xl gap-6 lg:grid-cols-2">
			<!-- Game Configuration -->
			<div class="space-y-6 lg:col-span-2">
				<div class="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold tracking-tight">Game Configuration</h2>
						{#if saved.game}
							<span
								class="flex animate-in items-center gap-1.5 text-xs font-medium text-green-500 duration-200 fade-in"
							>
								<Check size={14} /> Saved
							</span>
						{/if}
					</div>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="among-us-path">Among Us Installation Path</Label>
							<div class="flex gap-2">
								<Input
									id="among-us-path"
									bind:value={localPath}
									placeholder="C:\Program Files (x86)\Steam\steamapps\common\Among Us"
									onblur={() => validatePath(localPath)}
									class={pathError ? 'border-destructive focus-visible:ring-destructive' : ''}
								/>
								<Button variant="outline" onclick={handleBrowse}>Browse</Button>
								<Button variant="outline" onclick={handleAutoDetect} disabled={isDetecting}>
									<RefreshCw class="h-4 w-4 {isDetecting ? 'animate-spin' : ''}" />
								</Button>
							</div>
							<p class="text-sm text-muted-foreground">
								The folder where Among Us is installed (contains "Among Us.exe")
							</p>
							{#if pathError}<p class="text-sm text-destructive">{pathError}</p>{/if}
						</div>

						<div class="space-y-2">
							<Label>Game Platform</Label>
							<div class="flex gap-2">
								{#each [['steam', 'Steam / Itch.io'], ['epic', 'Epic Games'], ['xbox', 'Xbox / MS Store']] as [value, label], i (i)}
									<Button
										variant={localPlatform === value ? 'default' : 'outline'}
										onclick={() => (localPlatform = value as GamePlatform)}
										class="flex-1"
									>
										{label}
									</Button>
								{/each}
							</div>
							<p class="text-sm text-muted-foreground">
								{localPlatform === 'steam'
									? 'Steam installation'
									: localPlatform === 'epic'
										? 'Epic Games installation (requires Epic Games login)'
										: 'Xbox / Microsoft Store installation'}
							</p>
						</div>

						{#if localPlatform === 'epic'}
							<div class="flex items-center justify-between rounded-md bg-muted/50 p-3">
								<div class="space-y-0.5">
									<p class="text-sm font-medium">Account Status</p>
									<p
										class="text-sm"
										class:text-green-500={isLoggedIn}
										class:text-orange-500={!isLoggedIn}
									>
										{isLoggedIn ? 'Logged in' : 'Not logged in'}
									</p>
								</div>
								<Button variant="outline" size="sm" onclick={() => (epicLoginOpen = true)}>
									{isLoggedIn ? 'Manage Account' : 'Login to Epic Games'}
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- BepInEx Configuration -->
			<div class="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold tracking-tight">BepInEx Configuration</h2>
					{#if saved.bepinex}
						<span
							class="flex animate-in items-center gap-1.5 text-xs font-medium text-green-500 duration-200 fade-in"
						>
							<Check size={14} /> Saved
						</span>
					{/if}
				</div>
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="bepinex-url">BepInEx Download URL</Label>
						<Input
							id="bepinex-url"
							bind:value={localUrl}
							placeholder="https://builds.bepinex.dev/..."
						/>
					</div>

					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label for="cache-bepinex">Keep Local Copy</Label>
							<p class="text-sm text-muted-foreground">
								Cache BepInEx locally for faster profile creation
							</p>
						</div>
						<Switch id="cache-bepinex" bind:checked={localCacheBepInEx} />
					</div>

					{#if localCacheBepInEx}
						<div class="flex items-center justify-between rounded-md bg-muted/50 p-3">
							<div class="space-y-0.5">
								<p class="text-sm font-medium">Cache Status</p>
								<p class="text-sm text-muted-foreground">
									{#if isCacheDownloading}
										Downloading... {cacheDownloadProgress.toFixed(1)}%
									{:else}
										<span
											class:text-green-500={isCacheExists}
											class:text-orange-500={!isCacheExists}
										>
											{isCacheExists ? 'Cached' : 'Not cached'}
										</span>
									{/if}
								</p>
							</div>
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={handleDownloadToCache}
									disabled={isCacheDownloading}
								>
									{#if isCacheDownloading}
										<RefreshCw class="mr-2 h-4 w-4 animate-spin" /> Downloading
									{:else}
										<Download class="mr-2 h-4 w-4" /> {isCacheExists ? 'Re-download' : 'Download'}
									{/if}
								</Button>
								{#if isCacheExists}
									<Button variant="outline" size="sm" onclick={handleClearCache}>
										<Trash2 class="mr-2 h-4 w-4" /> Clear
									</Button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- App Behavior -->
			<div class="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-lg font-semibold tracking-tight">App Behavior</h2>
					{#if saved.app}
						<span
							class="flex animate-in items-center gap-1.5 text-xs font-medium text-green-500 duration-200 fade-in"
						>
							<Check size={14} /> Saved
						</span>
					{/if}
				</div>
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label for="close-on-launch">Close on Launch</Label>
						<p class="text-sm text-muted-foreground">
							Automatically close launcher after launching game
						</p>
					</div>
					<Switch id="close-on-launch" bind:checked={localCloseOnLaunch} />
				</div>
			</div>

			<!-- About -->
			<div class="lg:col-span-2">
				<div class="relative overflow-hidden rounded-xl border border-border/50 p-8">
					<div class="pointer-events-none absolute inset-0 overflow-hidden">
						{#each stars as star, i (i)}
							<div
								class="star absolute rounded-full bg-primary/30"
								style="left:{star.left};top:{star.top};width:{star.size}px;height:{star.size}px; {star.duration} ease-in-out infinite;animation-delay:{star.delay}"
							></div>
						{/each}
					</div>
					<div
						class="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left"
					>
						<div class="flex-1">
							<div class="mb-3 flex flex-col items-center gap-2 sm:flex-row sm:items-baseline">
								<h2 class="text-xl font-semibold">Starlight PC</h2>
								<span
									class="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
								>
									{#await getVersion()}v...{:then v}v{v}{/await}
								</span>
							</div>
							<div
								class="mb-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70 sm:justify-start"
							>
								<span class="flex items-center gap-1"
									><Heart class="h-3 w-3" />{new Date().getFullYear()} All Of Us Mods</span
								>
								<span class="hidden sm:inline">|</span>
								<span>GNU GPLv3 License</span>
							</div>
							<div class="flex flex-wrap justify-center gap-3 sm:justify-start">
								<Button
									variant="outline"
									size="sm"
									onclick={() => openUrl(GITHUB_URL)}
									class="gap-2"
								>
									<Github class="h-4 w-4" /> View Source <ExternalLink
										class="h-3 w-3 text-muted-foreground"
									/>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<EpicLoginDialog
	bind:open={epicLoginOpen}
	onChange={() => epicService.isLoggedIn().then((v) => (isLoggedIn = v))}
/>
