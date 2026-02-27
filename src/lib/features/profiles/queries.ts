import { queryOptions } from '@tanstack/svelte-query';
import { profileService } from './profile-service';
import {
	profileDiskFilesKey,
	profileUnifiedModsKey,
	profilesActiveQueryKey,
	profilesHasAnyQueryKey,
	profilesQueryKey
} from './profile-keys';

export const profileQueries = {
	all: () =>
		queryOptions({
			queryKey: profilesQueryKey,
			queryFn: () => profileService.getProfiles()
		}),
	active: () =>
		queryOptions({
			queryKey: profilesActiveQueryKey,
			queryFn: () => profileService.getActiveProfile()
		}),
	hasAny: () =>
		queryOptions({
			queryKey: profilesHasAnyQueryKey,
			queryFn: () => profileService.getProfiles().then((profiles) => profiles.length > 0)
		}),
	diskFiles: (profilePath: string) =>
		queryOptions({
			queryKey: profileDiskFilesKey(profilePath),
			queryFn: () => profileService.getModFiles(profilePath),
			enabled: !!profilePath
		}),
	unifiedMods: (profileId: string) =>
		queryOptions({
			queryKey: profileUnifiedModsKey(profileId),
			queryFn: () => profileService.getUnifiedMods(profileId),
			enabled: !!profileId
		})
};
