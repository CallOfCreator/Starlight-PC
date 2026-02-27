import type { QueryClient } from '@tanstack/svelte-query';
import { profileService } from './profile-service';
import { modInstallService } from './mod-install-service';
import type { UnifiedMod } from './schema';
import {
	profileDiskFilesKey,
	profilesActiveQueryKey,
	profilesQueryKey
} from './profile-keys';

export const profileMutations = {
	create: (queryClient: QueryClient) => ({
		mutationFn: (name: string) => profileService.createProfile(name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	delete: (queryClient: QueryClient) => ({
		mutationFn: (profileId: string) => profileService.deleteProfile(profileId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	rename: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; newName: string }) =>
			profileService.renameProfile(args.profileId, args.newName),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	addMod: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; modId: string; version: string; file: string }) =>
			profileService.addModToProfile(args.profileId, args.modId, args.version, args.file),
		onSuccess: async (_data: void, args: { profileId: string }) => {
			const profiles = queryClient.getQueryData<{ id: string; path: string }[]>(profilesQueryKey);
			const profile = profiles?.find((p) => p.id === args.profileId);
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
			if (profile?.path) {
				queryClient.invalidateQueries({ queryKey: profileDiskFilesKey(profile.path) });
			}
		}
	}),

	removeMod: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; modId: string }) =>
			profileService.removeModFromProfile(args.profileId, args.modId),
		onSuccess: async (_data: void, args: { profileId: string }) => {
			const profiles = queryClient.getQueryData<{ id: string; path: string }[]>(profilesQueryKey);
			const profile = profiles?.find((p) => p.id === args.profileId);
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
			if (profile?.path) {
				queryClient.invalidateQueries({ queryKey: profileDiskFilesKey(profile.path) });
			}
		}
	}),

	deleteUnifiedMod: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; mod: UnifiedMod }) =>
			profileService.deleteUnifiedMod(args.profileId, args.mod),
		onSuccess: async (_data: void, args: { profileId: string }) => {
			const profiles = queryClient.getQueryData<{ id: string; path: string }[]>(profilesQueryKey);
			const profile = profiles?.find((p) => p.id === args.profileId);
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
			if (profile?.path) {
				queryClient.invalidateQueries({ queryKey: profileDiskFilesKey(profile.path) });
			}
		}
	}),

	cleanupMissingMods: (queryClient: QueryClient) => ({
		mutationFn: (profileId: string) => profileService.cleanupMissingMods(profileId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	updatePlayTime: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; durationMs: number }) =>
			profileService.addPlayTime(args.profileId, args.durationMs),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	retryBepInExInstall: (queryClient: QueryClient) => ({
		mutationFn: (args: { profileId: string; profilePath: string }) =>
			profileService.retryBepInExInstall(args.profileId, args.profilePath),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
		}
	}),

	updateLastLaunched: (queryClient: QueryClient) => ({
		mutationFn: (profileId: string) => profileService.updateLastLaunched(profileId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
			queryClient.invalidateQueries({ queryKey: profilesActiveQueryKey });
		}
	}),

	installMods: (queryClient: QueryClient) => ({
		mutationFn: async (args: {
			profileId: string;
			profilePath: string;
			mods: Array<{ modId: string; version: string }>;
		}) => {
			const results = await modInstallService.installModsToProfile(args.mods, args.profilePath);
			for (const result of results) {
				await profileService.addModToProfile(
					args.profileId,
					result.modId,
					result.version,
					result.fileName
				);
			}
			return results;
		},
		onSuccess: (
			_data: Array<{ modId: string; version: string; fileName: string }>,
			args: { profileId: string; profilePath: string }
		) => {
			queryClient.invalidateQueries({ queryKey: profilesQueryKey });
			queryClient.invalidateQueries({ queryKey: profileDiskFilesKey(args.profilePath) });
		}
	})
};

// Type helpers for mutation results
export type CreateProfileMutation = ReturnType<typeof profileMutations.create>;
export type DeleteProfileMutation = ReturnType<typeof profileMutations.delete>;
