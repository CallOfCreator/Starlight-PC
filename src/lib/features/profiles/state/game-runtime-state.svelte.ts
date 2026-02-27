import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { profileWorkflowService } from '../profile-workflow-service';
import { notifyProfilesInvalidated } from './profile-invalidation-bridge';

interface GameStatePayload {
	running: boolean;
	running_count?: number;
	profile_instance_counts?: Record<string, number>;
}

class GameRuntimeStateStore {
	#running = $state(false);
	#runningCount = $state(0);
	#profileInstanceCounts = $state<Record<string, number>>({});
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

	get runningCount(): number {
		return this.#runningCount;
	}

	getProfileRunningInstanceCount(profileId: string): number {
		return this.#profileInstanceCounts[profileId] ?? 0;
	}

	isProfileRunning(profileId: string): boolean {
		return this.getProfileRunningInstanceCount(profileId) > 0;
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
		if (this.#sessionStartTime) return;
		this.#sessionStartTime = Date.now();
		this.#currentTime = this.#sessionStartTime;
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
				this.#runningProfileId = null;
			}

			this.#running = event.payload.running;
			this.#runningCount = event.payload.running_count ?? (event.payload.running ? 1 : 0);
			this.#profileInstanceCounts = event.payload.profile_instance_counts ?? {};

			if (
				this.#running &&
				!this.#runningProfileId &&
				Object.keys(this.#profileInstanceCounts).length > 0
			) {
				this.#runningProfileId = Object.keys(this.#profileInstanceCounts)[0] ?? null;
			}

			if (this.#running && this.#sessionStartTime === null) {
				this.startTimer();
			}
		});
	}

	async setRunningProfile(profileId: string | null): Promise<void> {
		if (!profileId) {
			await this.finalizeSession();
			this.#runningProfileId = null;
			this.#running = false;
			this.#runningCount = 0;
			this.#profileInstanceCounts = {};
			return;
		}

		this.#running = true;
		this.#runningCount = Math.max(1, this.#runningCount);
		this.#runningProfileId = profileId;
		this.#profileInstanceCounts = {
			...this.#profileInstanceCounts,
			[profileId]: Math.max(1, this.#profileInstanceCounts[profileId] ?? 0)
		};
		this.startTimer();
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
