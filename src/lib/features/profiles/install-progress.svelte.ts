import { SvelteMap } from 'svelte/reactivity';
import type { DownloadProgress } from './bepinex-download';

function createInstallProgressState() {
	const activeInstalls = new SvelteMap<string, DownloadProgress>();

	return {
		get activeInstalls() {
			return activeInstalls;
		},

		setProgress(profileId: string, progress: DownloadProgress) {
			activeInstalls.set(profileId, progress);
		},

		clearProgress(profileId: string) {
			activeInstalls.delete(profileId);
		},

		getProgress(profileId: string): DownloadProgress | undefined {
			return activeInstalls.get(profileId);
		},

		isInstalling(profileId: string): boolean {
			return activeInstalls.has(profileId);
		}
	};
}

export const installProgress = createInstallProgressState();
