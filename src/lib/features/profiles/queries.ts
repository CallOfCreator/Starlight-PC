import { queryOptions } from '@tanstack/svelte-query';
import { profileWorkflowService } from './profile-workflow-service';
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
			queryFn: () => profileWorkflowService.getProfiles()
		}),
	active: () =>
		queryOptions({
			queryKey: profilesActiveQueryKey,
			queryFn: () => profileWorkflowService.getActiveProfile()
		}),
	hasAny: () =>
		queryOptions({
			queryKey: profilesHasAnyQueryKey,
			queryFn: () => profileWorkflowService.getProfiles().then((profiles) => profiles.length > 0)
		}),
	diskFiles: (profilePath: string) =>
		queryOptions({
			queryKey: profileDiskFilesKey(profilePath),
			queryFn: () => profileWorkflowService.getModFiles(profilePath),
			enabled: !!profilePath
		}),
	unifiedMods: (profileId: string) =>
		queryOptions({
			queryKey: profileUnifiedModsKey(profileId),
			queryFn: () => profileWorkflowService.getUnifiedMods(profileId),
			enabled: !!profileId
		})
};
