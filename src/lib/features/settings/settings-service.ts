import { invoke } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { debug } from '@tauri-apps/plugin-log';
import { settingsRepository } from './settings-repository';
import type { BepInExProgress } from '../profiles/schema';
import type { GamePlatform } from './schema';

class SettingsService {
	readonly getSettings = () => settingsRepository.get();
	readonly updateSettings = (updates: Parameters<typeof settingsRepository.update>[0]) =>
		settingsRepository.update(updates);

	readonly detectAmongUsPath = () => invoke<string | null>('detect_among_us');
	readonly detectGamePlatform = (path: string) =>
		invoke<GamePlatform>('get_game_platform', { path });

	async getBepInExCachePath(): Promise<string> {
		const dataDir = await appDataDir();
		const cacheDir = await join(dataDir, 'cache');
		return await join(cacheDir, 'bepinex.zip');
	}

	async checkBepInExCacheExists(): Promise<boolean> {
		return invoke<boolean>('check_bepinex_cache_exists', {
			cachePath: await this.getBepInExCachePath()
		});
	}

	async downloadBepInExToCache(url: string, onProgress?: (progress: BepInExProgress) => void) {
		const { listen } = await import('@tauri-apps/api/event');
		let unlisten: (() => void) | undefined;
		try {
			if (onProgress) {
				unlisten = await listen<BepInExProgress>('bepinex-progress', (e) => onProgress(e.payload));
			}
			await invoke('download_bepinex_to_cache', { url, cachePath: await this.getBepInExCachePath() });
		} finally {
			unlisten?.();
		}
	}

	async clearBepInExCache() {
		await invoke('clear_bepinex_cache', { cachePath: await this.getBepInExCachePath() });
	}

	async openDataFolder() {
		await revealItemInDir(await appDataDir());
	}

	/**
	 * Auto-detects the game architecture (x86/x64) and updates the BepInEx URL accordingly.
	 * Checks for UnityCrashHandler64.exe to determine if the game is 64-bit.
	 * @returns The new URL if it was updated, undefined otherwise.
	 */
	async autoDetectBepInExArchitecture(gamePath: string): Promise<string | undefined> {
		const crashHandlerPath = `${gamePath}/UnityCrashHandler64.exe`;
		const settings = await this.getSettings();
		const currentUrl = settings.bepinex_url;

		const is64Bit = await exists(crashHandlerPath);
		const updatedUrl = is64Bit
			? currentUrl.replace(/win-x86(?=-)/i, 'win-x64')
			: currentUrl.replace(/win-x64(?=-)/i, 'win-x86');

		if (updatedUrl !== currentUrl) {
			await this.updateSettings({ bepinex_url: updatedUrl });
			debug(`BepInEx architecture updated to ${is64Bit ? 'x64' : 'x86'}`);
			return updatedUrl;
		}
		return undefined;
	}
}

export const settingsService = new SettingsService();
