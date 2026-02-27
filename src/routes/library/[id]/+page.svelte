<script lang="ts">
	import { page } from '$app/state';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { Debounced, watch } from 'runed';

	import { profileQueries } from '$lib/features/profiles/queries';
	import { profileMutations } from '$lib/features/profiles/mutations';
	import { modQueries } from '$lib/features/mods/queries';
	import { gameState } from '$lib/features/profiles/game-state.svelte';
	import { formatPlayTime } from '$lib/utils';
	import { showError } from '$lib/utils/toast';
	import type { Profile, UnifiedMod } from '$lib/features/profiles/schema';
	import type { Mod } from '$lib/features/mods/schema';
	import { profileUnifiedModsKey } from '$lib/features/profiles/profile-keys';
	import { mapModsById } from '$lib/features/mods/ui/mod-query-controller';
	import { findProfileById } from '$lib/features/profiles/ui/profile-query-controller';
	import {
		createProfileDetailController,
		profileDetailRuntime
	} from '$lib/features/profiles/ui/profile-detail-controller';
	import {
		filterProfileMods,
		getProfileModsPagination,
		paginateProfileMods,
		PROFILE_MODS_PAGE_SIZE
	} from '$lib/features/profiles/ui/profile-mods-view-model';

	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { ArrowLeft, Package } from '@lucide/svelte';
	import ProfileHeroSection from './_components/ProfileHeroSection.svelte';
	import ProfileModsToolbar from './_components/ProfileModsToolbar.svelte';
	import ProfileModsList from './_components/ProfileModsList.svelte';
	import ProfileDialogs from './_components/ProfileDialogs.svelte';
	import ProfileLogViewer from './_components/ProfileLogViewer.svelte';

	const queryClient = useQueryClient();
	const profileId = $derived(page.params.id ?? '');

	const profilesQuery = createQuery(() => profileQueries.all());
	const unifiedModsQuery = createQuery(() => ({
		...profileQueries.unifiedMods(profileId),
		enabled: !!profileId
	}));

	const profile = $derived(findProfileById(profilesQuery.data as Profile[] | undefined, profileId));

	const updateLastLaunched = createMutation(() => profileMutations.updateLastLaunched(queryClient));
	const deleteProfile = createMutation(() => profileMutations.delete(queryClient));
	const renameProfile = createMutation(() => profileMutations.rename(queryClient));
	const deleteUnifiedMod = createMutation(() => profileMutations.deleteUnifiedMod(queryClient));

	const controller = createProfileDetailController({
		launchProfile: profileDetailRuntime.launchProfile,
		updateLastLaunched: (id) => updateLastLaunched.mutateAsync(id),
		deleteProfile: (id) => deleteProfile.mutateAsync(id),
		removeProfileQueries: (id) =>
			queryClient.removeQueries({ queryKey: profileUnifiedModsKey(id) }),
		renameProfile: (id, newName) => renameProfile.mutateAsync({ profileId: id, newName }),
		deleteUnifiedMod: (id, mod) => deleteUnifiedMod.mutateAsync({ profileId: id, mod })
	});

	const modIds = $derived(Array.from(new Set(profile?.mods.map((mod) => mod.mod_id) ?? [])));
	const profileModsQuery = createQuery(() => ({
		queryKey: ['mods', 'profile-batch', ...modIds],
		enabled: modIds.length > 0,
		queryFn: async () => {
			const results = await Promise.allSettled(
				modIds.map((id) => queryClient.fetchQuery(modQueries.byId(id)))
			);
			return results
				.filter((result): result is PromiseFulfilledResult<Mod> => result.status === 'fulfilled')
				.map((result) => result.value);
		}
	}));
	const modsMap = $derived(mapModsById(profileModsQuery.data ?? []));

	let searchInput = $state('');
	const debouncedSearch = new Debounced(() => searchInput, 150);
	let currentPage = $state(0);

	let deleteDialogOpen = $state(false);
	let renameDialogOpen = $state(false);
	let modToDelete = $state<UnifiedMod | null>(null);
	let deleteModDialogOpen = $state(false);
	let newProfileName = $state('');
	let isLaunching = $state(false);
	let renameError = $state('');

	watch(
		() => debouncedSearch.current,
		() => {
			currentPage = 0;
		},
		{ lazy: true }
	);

	const filteredMods = $derived.by(() => {
		const unified = unifiedModsQuery.data ?? [];
		return filterProfileMods(unified, modsMap, debouncedSearch.current);
	});
	const displayedMods = $derived(
		paginateProfileMods(filteredMods, currentPage, PROFILE_MODS_PAGE_SIZE)
	);
	const pagination = $derived(
		getProfileModsPagination(filteredMods.length, currentPage, PROFILE_MODS_PAGE_SIZE)
	);

	const isSearching = $derived(debouncedSearch.current.trim().length > 0);
	const searchPlaceholder = $derived(
		unifiedModsQuery.data
			? `Search ${unifiedModsQuery.data.length.toLocaleString()} mods...`
			: 'Search mods...'
	);

	const runningInstanceCount = $derived(
		profile ? gameState.getProfileRunningInstanceCount(profile.id) : 0
	);
	const isRunning = $derived(runningInstanceCount > 0);
	const installState = $derived(profile ? gameState.getBepInExState(profile.id) : null);
	const isInstalling = $derived(
		profile?.bepinex_installed === false || installState?.status === 'installing'
	);
	const isDisabled = $derived(isInstalling || isRunning);
	const isLaunchDisabled = $derived(isInstalling);

	const totalPlayTime = $derived(
		(profile?.total_play_time ?? 0) + (isRunning ? gameState.getSessionDuration() : 0)
	);
	const lastLaunched = $derived(
		profile?.last_launched_at ? new Date(profile.last_launched_at).toLocaleDateString() : 'Never'
	);

	async function handleLaunch() {
		if (!profile || isLaunchDisabled) return;
		isLaunching = true;
		try {
			await controller.launchProfile(profile);
		} catch (error) {
			showError(error);
		} finally {
			isLaunching = false;
		}
	}

	async function handleDeleteProfile() {
		if (!profile) return;
		deleteDialogOpen = false;
		try {
			await controller.deleteProfile(profile);
		} catch (error) {
			showError(error);
		}
	}

	function openRenameDialog() {
		if (!profile) return;
		newProfileName = profile.name;
		renameError = '';
		renameDialogOpen = true;
	}

	async function handleRenameProfile() {
		if (!profile || !newProfileName.trim()) return;
		renameError = '';
		try {
			await controller.renameProfile(profile, newProfileName);
			renameDialogOpen = false;
		} catch (error) {
			renameError = error instanceof Error ? error.message : 'Failed to rename';
		}
	}

	function confirmDeleteMod(mod: UnifiedMod) {
		modToDelete = mod;
		deleteModDialogOpen = true;
	}

	async function handleDeleteMod() {
		if (!profile || !modToDelete) return;
		deleteModDialogOpen = false;
		try {
			await controller.removeMod(profile, modToDelete);
		} catch (error) {
			showError(error, 'Remove mod');
		} finally {
			modToDelete = null;
		}
	}

	function cancelDeleteMod() {
		deleteModDialogOpen = false;
		modToDelete = null;
	}
</script>

{#if profilesQuery.isPending}
	<div class="px-10 py-8">
		<div class="mb-8 flex flex-col items-start gap-6 md:flex-row md:items-center">
			<Skeleton class="h-45 w-45 rounded-lg" />
			<div class="flex-1 space-y-4">
				<Skeleton class="h-10 w-64" />
				<Skeleton class="h-5 w-48" />
				<Skeleton class="h-5 w-40" />
				<div class="flex gap-3">
					<Skeleton class="h-10 w-28" />
					<Skeleton class="h-10 w-32" />
					<Skeleton class="h-10 w-24" />
				</div>
			</div>
		</div>
	</div>
{:else if !profile}
	<div class="flex h-full flex-col items-center justify-center gap-4 px-10 py-8">
		<Package class="h-16 w-16 text-muted-foreground/30" />
		<h2 class="text-xl font-bold">Profile not found</h2>
		<p class="text-muted-foreground">This profile may have been deleted.</p>
		<Button href="/library">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Library
		</Button>
	</div>
{:else}
	<div class="px-10 py-8">
		<Button variant="ghost" size="sm" class="mb-4" href="/library">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Library
		</Button>

		<ProfileHeroSection
			{profile}
			{isRunning}
			{runningInstanceCount}
			{lastLaunched}
			totalPlayTimeLabel={formatPlayTime(totalPlayTime)}
			{isDisabled}
			{isLaunchDisabled}
			{isLaunching}
			onLaunch={handleLaunch}
			onOpenFolder={() => controller.openProfileFolder(profile)}
			onOpenRename={openRenameDialog}
			onOpenDelete={() => (deleteDialogOpen = true)}
		/>

		<hr class="my-5 border-t border-muted-foreground/20" />

		<div class="rounded-lg bg-white/3 p-4">
			<ProfileModsToolbar
				bind:searchInput
				{searchPlaceholder}
				onInstallMods={controller.goToInstallMods}
			/>
			<ProfileModsList
				isPending={unifiedModsQuery.isPending}
				{displayedMods}
				{isSearching}
				{profile}
				{modsMap}
				{isDisabled}
				showPagination={pagination.showPagination}
				{currentPage}
				totalPages={pagination.totalPages}
				hasNextPage={pagination.hasNextPage}
				onClearSearch={() => (searchInput = '')}
				onInstallMods={controller.goToInstallMods}
				onDeleteMod={confirmDeleteMod}
				onPrevPage={() => currentPage--}
				onNextPage={() => currentPage++}
			/>
		</div>
		<ProfileLogViewer {profile} {isRunning} />
	</div>

	<ProfileDialogs
		{profile}
		bind:deleteDialogOpen
		bind:renameDialogOpen
		bind:deleteModDialogOpen
		bind:newProfileName
		{renameError}
		renamePending={renameProfile.isPending}
		onNewProfileNameInput={(event) =>
			(newProfileName = (event.currentTarget as HTMLInputElement).value)}
		onCancelDeleteProfile={() => (deleteDialogOpen = false)}
		onConfirmDeleteProfile={handleDeleteProfile}
		onCancelRename={() => (renameDialogOpen = false)}
		onConfirmRename={handleRenameProfile}
		onCancelDeleteMod={cancelDeleteMod}
		onConfirmDeleteMod={handleDeleteMod}
	/>
{/if}
