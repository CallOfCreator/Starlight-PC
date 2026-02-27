import type { Profile } from '$lib/features/profiles/schema';
import type { ModDownloadProgress } from '$lib/features/profiles/schema';
import { showSuccess } from '$lib/utils/toast';
import type { ResolvedDependency } from './types';

interface InstallPanelControllerDeps {
	onDownloadProgress: (handler: (progress: ModDownloadProgress) => void) => Promise<() => void>;
	installMods: (input: {
		profileId: string;
		profilePath: string;
		mods: { modId: string; version: string }[];
	}) => Promise<unknown>;
	setModProgress: (modId: string, progress: ModDownloadProgress) => void;
	clearModProgress: (modId: string) => void;
}

export function createInstallPanelController(deps: InstallPanelControllerDeps) {
	return {
		buildInstallList(args: {
			modId: string;
			selectedVersion: string;
			installableDependencies: ResolvedDependency[];
			selectedDependencies: Set<string>;
			installedDepsInProfile: Set<string>;
		}) {
			const list = [{ modId: args.modId, version: args.selectedVersion }];
			for (const dep of args.installableDependencies) {
				if (
					args.selectedDependencies.has(dep.mod_id) &&
					!args.installedDepsInProfile.has(dep.mod_id)
				) {
					list.push({ modId: dep.mod_id, version: dep.resolvedVersion });
				}
			}
			return list;
		},

		async installToProfile(args: {
			profile: Profile;
			mods: { modId: string; version: string }[];
			onInstalled?: () => void;
		}): Promise<{ installedModIds: string[] }> {
			const installedModIds = args.mods.map((mod) => mod.modId);
			let unlisten: (() => void) | null = null;
			try {
				unlisten = await deps.onDownloadProgress((progress) => {
					deps.setModProgress(progress.mod_id, progress);
				});
				await deps.installMods({
					profileId: args.profile.id,
					profilePath: args.profile.path,
					mods: args.mods
				});
				showSuccess(`Installed to ${args.profile.name}`);
				args.onInstalled?.();
				return { installedModIds };
			} finally {
				unlisten?.();
				for (const modId of installedModIds) {
					deps.clearModProgress(modId);
				}
			}
		}
	};
}
