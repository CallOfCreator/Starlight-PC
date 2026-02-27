import { SvelteMap } from 'svelte/reactivity';
import type { ModDownloadProgress } from '../schema';

export type ModDownloadState =
	| { status: 'downloading'; progress: ModDownloadProgress }
	| { status: 'complete' }
	| { status: 'error'; message: string };

class ModDownloadStateStore {
	#downloads = new SvelteMap<string, ModDownloadState>();

	get downloads() {
		return this.#downloads;
	}

	setProgress(modId: string, progress: ModDownloadProgress) {
		if (progress.stage === 'complete') {
			this.#downloads.set(modId, { status: 'complete' });
		} else {
			this.#downloads.set(modId, { status: 'downloading', progress });
		}
	}

	setError(modId: string, message: string) {
		this.#downloads.set(modId, { status: 'error', message });
	}

	clear(modId: string) {
		this.#downloads.delete(modId);
	}

	clearAll() {
		this.#downloads.clear();
	}

	getState(modId: string): ModDownloadState | undefined {
		return this.#downloads.get(modId);
	}

	isDownloading(modId: string): boolean {
		return this.#downloads.get(modId)?.status === 'downloading';
	}

	getStageText(stage: ModDownloadProgress['stage']): string {
		switch (stage) {
			case 'connecting':
				return 'Connecting...';
			case 'downloading':
				return 'Downloading...';
			case 'verifying':
				return 'Verifying checksum...';
			case 'writing':
				return 'Writing file...';
			case 'complete':
				return 'Complete';
			default:
				return '';
		}
	}
}

export const modDownloadState = new ModDownloadStateStore();
