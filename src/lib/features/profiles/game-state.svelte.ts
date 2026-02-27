import {
	bepinexInstallState,
	type BepInExInstallState
} from './state/bepinex-install-state.svelte';
import { gameRuntimeState } from './state/game-runtime-state.svelte';
import { modDownloadState, type ModDownloadState } from './state/mod-download-state.svelte';
import {
	registerProfilesInvalidateCallback,
	notifyProfilesInvalidated as invalidateProfiles
} from './state/profile-invalidation-bridge';
import type { BepInExProgress, ModDownloadProgress } from './schema';

class GameStateFacade {
	get running(): boolean {
		return gameRuntimeState.running;
	}

	get runningProfileId(): string | null {
		return gameRuntimeState.runningProfileId;
	}

	get runningCount(): number {
		return gameRuntimeState.runningCount;
	}

	getProfileRunningInstanceCount(profileId: string): number {
		return gameRuntimeState.getProfileRunningInstanceCount(profileId);
	}

	isProfileRunning(profileId: string): boolean {
		return gameRuntimeState.isProfileRunning(profileId);
	}

	getSessionDuration(): number {
		return gameRuntimeState.getSessionDuration();
	}

	init() {
		return gameRuntimeState.init();
	}

	setRunningProfile(profileId: string | null) {
		return gameRuntimeState.setRunningProfile(profileId);
	}

	destroy() {
		gameRuntimeState.destroy();
	}

	get bepinexInstalls() {
		return bepinexInstallState.installs;
	}

	setBepInExProgress(profileId: string, progress: BepInExProgress) {
		bepinexInstallState.setProgress(profileId, progress);
	}

	setBepInExError(profileId: string, message: string) {
		bepinexInstallState.setError(profileId, message);
	}

	clearBepInExProgress(profileId: string) {
		bepinexInstallState.clear(profileId);
	}

	getBepInExState(profileId: string): BepInExInstallState | undefined {
		return bepinexInstallState.getState(profileId);
	}

	isBepInExInstalling(profileId: string): boolean {
		return bepinexInstallState.isInstalling(profileId);
	}

	hasBepInExError(profileId: string): boolean {
		return bepinexInstallState.hasError(profileId);
	}

	get modDownloads() {
		return modDownloadState.downloads;
	}

	setModDownloadProgress(modId: string, progress: ModDownloadProgress) {
		modDownloadState.setProgress(modId, progress);
	}

	setModDownloadError(modId: string, message: string) {
		modDownloadState.setError(modId, message);
	}

	clearModDownload(modId: string) {
		modDownloadState.clear(modId);
	}

	clearAllModDownloads() {
		modDownloadState.clearAll();
	}

	getModDownloadState(modId: string): ModDownloadState | undefined {
		return modDownloadState.getState(modId);
	}

	isModDownloading(modId: string): boolean {
		return modDownloadState.isDownloading(modId);
	}

	getModDownloadStageText(stage: ModDownloadProgress['stage']): string {
		return modDownloadState.getStageText(stage);
	}
}

export { registerProfilesInvalidateCallback, invalidateProfiles };
export const gameState = new GameStateFacade();
