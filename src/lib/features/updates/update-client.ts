import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface RawUpdateClient {
	check(): Promise<Update | null>;
	downloadAndInstall(update: Update, onEvent?: (event: DownloadEvent) => void): Promise<void>;
	relaunch(): Promise<void>;
}

class TauriUpdateClient implements RawUpdateClient {
	check(): Promise<Update | null> {
		return check();
	}

	downloadAndInstall(update: Update, onEvent?: (event: DownloadEvent) => void): Promise<void> {
		return update.downloadAndInstall((event) => onEvent?.(event));
	}

	relaunch(): Promise<void> {
		return relaunch();
	}
}

export const updateClient: RawUpdateClient = new TauriUpdateClient();
