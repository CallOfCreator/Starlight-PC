import type { QueryClient } from '@tanstack/svelte-query';
import { profileMutations } from './mutations';
import type { Profile, UnifiedMod } from './schema';

export function createProfileMutationController(queryClient: QueryClient) {
	return {
		updateLastLaunchedMutation: () => profileMutations.updateLastLaunched(queryClient),
		deleteProfileMutation: () => profileMutations.delete(queryClient),
		renameProfileMutation: () => profileMutations.rename(queryClient),
		deleteUnifiedModMutation: () => profileMutations.deleteUnifiedMod(queryClient),
		createProfileMutation: () => profileMutations.create(queryClient),
		retryBepInExInstallMutation: () => profileMutations.retryBepInExInstall(queryClient),
		installModsMutation: () => profileMutations.installMods(queryClient),
		buildRenameArgs: (profile: Profile, newName: string) => ({ profileId: profile.id, newName }),
		buildDeleteUnifiedModArgs: (profile: Profile, mod: UnifiedMod) => ({
			profileId: profile.id,
			mod
		})
	};
}
