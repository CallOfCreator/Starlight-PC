import { SvelteMap } from 'svelte/reactivity';
import type { BepInExProgress } from '../schema';

export type BepInExInstallState =
	| { status: 'installing'; progress: BepInExProgress }
	| { status: 'error'; message: string };

class BepInExInstallStateStore {
	#installs = new SvelteMap<string, BepInExInstallState>();

	get installs() {
		return this.#installs;
	}

	setProgress(profileId: string, progress: BepInExProgress) {
		this.#installs.set(profileId, { status: 'installing', progress });
	}

	setError(profileId: string, message: string) {
		this.#installs.set(profileId, { status: 'error', message });
	}

	clear(profileId: string) {
		this.#installs.delete(profileId);
	}

	getState(profileId: string): BepInExInstallState | undefined {
		return this.#installs.get(profileId);
	}

	isInstalling(profileId: string): boolean {
		return this.#installs.get(profileId)?.status === 'installing';
	}

	hasError(profileId: string): boolean {
		return this.#installs.get(profileId)?.status === 'error';
	}
}

export const bepinexInstallState = new BepInExInstallStateStore();
