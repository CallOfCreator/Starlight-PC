import { listen, type UnlistenFn } from '@tauri-apps/api/event';

interface GameStatePayload {
	running: boolean;
	profileId?: string;
}

class GameStateService {
	#running = $state(false);
	#runningProfileId = $state<string | null>(null);
	#unlisten: UnlistenFn | null = null;

	get running(): boolean {
		return this.#running;
	}

	get runningProfileId(): string | null {
		return this.#runningProfileId;
	}

	isProfileRunning(profileId: string): boolean {
		return this.#running && this.#runningProfileId === profileId;
	}

	async init() {
		if (this.#unlisten) return;

		this.#unlisten = await listen<GameStatePayload>('game-state-changed', (event) => {
			this.#running = event.payload.running;
			this.#runningProfileId = event.payload.profileId ?? null;
		});
	}

	setRunningProfile(profileId: string | null): void {
		this.#running = profileId !== null;
		this.#runningProfileId = profileId;
	}

	destroy() {
		if (this.#unlisten) {
			this.#unlisten();
			this.#unlisten = null;
		}
	}
}

export const gameState = new GameStateService();
