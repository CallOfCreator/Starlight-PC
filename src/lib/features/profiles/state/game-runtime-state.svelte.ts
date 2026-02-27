import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { profileWorkflowService } from '../profile-workflow-service';
import { notifyProfilesInvalidated } from './profile-invalidation-bridge';

interface GameStatePayload {
	running: boolean;
	profileId?: string;
}

class GameRuntimeStateStore {
	#running = $state(false);
	#runningProfileId = $state<string | null>(null);
	#sessionStartTime = $state<number | null>(null);
	#currentTime = $state(Date.now());
	#unlisten: UnlistenFn | null = null;
	#interval: ReturnType<typeof setInterval> | null = null;

	get running(): boolean {
		return this.#running;
	}

	get runningProfileId(): string | null {
		return this.#runningProfileId;
	}

	isProfileRunning(profileId: string): boolean {
		return this.#running && this.#runningProfileId === profileId;
	}

	getSessionDuration(): number {
		if (!this.#sessionStartTime) return 0;
		return this.#currentTime - this.#sessionStartTime;
	}

	private async finalizeSession() {
		if (this.#running && this.#runningProfileId) {
			const duration = this.getSessionDuration();
			if (duration > 0) {
				await profileWorkflowService.addPlayTime(this.#runningProfileId, duration);
				notifyProfilesInvalidated();
			}
		}

		this.#sessionStartTime = null;
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
	}

	private startTimer() {
		this.#sessionStartTime = Date.now();
		this.#currentTime = Date.now();
		if (!this.#interval) {
			this.#interval = setInterval(() => {
				this.#currentTime = Date.now();
			}, 1000);
		}
	}

	async init() {
		if (this.#unlisten) return;
		this.#unlisten = await listen<GameStatePayload>('game-state-changed', async (event) => {
			if (this.#running && !event.payload.running) {
				await this.finalizeSession();
			}

			this.#running = event.payload.running;
			this.#runningProfileId = event.payload.profileId ?? null;

			if (this.#running) {
				this.startTimer();
			}
		});
	}

	async setRunningProfile(profileId: string | null): Promise<void> {
		if (!profileId) {
			await this.finalizeSession();
		}

		this.#running = profileId !== null;
		this.#runningProfileId = profileId;

		if (profileId) {
			this.startTimer();
		}
	}

	destroy() {
		if (this.#unlisten) {
			this.#unlisten();
			this.#unlisten = null;
		}
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
	}
}

export const gameRuntimeState = new GameRuntimeStateStore();
