import { platform } from '@tauri-apps/plugin-os';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Platform, TauriWindow } from './types';

export function resolvePlatform(os: string): Platform {
	return os === 'macos' || os === 'windows' ? os : 'linux';
}

export function hasTauriInternals(): boolean {
	const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
	return !!tauriWindow.__TAURI_INTERNALS__;
}

export function getTauriWindowContext(): { platformName: Platform; appWindow: TauriWindow } {
	const os = platform();
	return {
		platformName: resolvePlatform(os),
		appWindow: getCurrentWindow()
	};
}
