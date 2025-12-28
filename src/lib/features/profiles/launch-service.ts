import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/plugin-fs';
import { profileService } from './profile-service';
import { settingsService } from '../settings/settings-service';
import type { Profile } from './schema';

class LaunchService {
	async launchProfile(profile: Profile): Promise<void> {
		const settings = await settingsService.getSettings();

		if (!settings.among_us_path) throw new Error('Among Us path not configured');

		const gameExePath = await join(settings.among_us_path, 'Among Us.exe');
		const gameExists = await exists(gameExePath);
		if (!gameExists) {
			throw new Error('Among Us.exe not found at configured path');
		}

		const isRunning = await invoke<boolean>('check_among_us_running');
		if (isRunning) throw new Error('Among Us is already running');

		const bepinexDll = await join(profile.path, 'BepInEx', 'core', 'BepInEx.Unity.IL2CPP.dll');
		const bepinexExists = await exists(bepinexDll);
		if (!bepinexExists) {
			throw new Error('BepInEx DLL not found. Please wait for installation to complete.');
		}

		const dotnetDir = await join(profile.path, 'dotnet');
		const coreClr = await join(dotnetDir, 'coreclr.dll');
		const coreClrExists = await exists(coreClr);
		if (!coreClrExists) {
			throw new Error('dotnet runtime not found. Please wait for installation to complete.');
		}

		try {
			await invoke('launch_modded', {
				gameExe: gameExePath, // match 'game_exe'
				profilePath: profile.path, // match 'profile_path'
				bepinexDll: bepinexDll, // match 'bepinex_dll'
				dotnetDir: dotnetDir, // match 'dotnet_dir'
				coreclrPath: coreClr // match 'coreclr_path'
			});
		} catch (error) {
			throw new Error(error instanceof Error ? error.message : 'Failed to launch Among Us process');
		}

		await profileService.updateLastLaunched(profile.id);

		if (settings.close_on_launch) {
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			getCurrentWindow().close();
		}
	}

	async launchVanilla(): Promise<void> {
		const settings = await settingsService.getSettings();

		if (!settings.among_us_path) throw new Error('Among Us path not configured');

		const gameExePath = await join(settings.among_us_path, 'Among Us.exe');
		const gameExists = await exists(gameExePath);
		if (!gameExists) {
			throw new Error('Among Us.exe not found at configured path');
		}

		try {
			await invoke('launch_vanilla', { game_exe: gameExePath });
		} catch (error) {
			throw new Error(error instanceof Error ? error.message : 'Failed to launch Among Us process');
		}
	}
}

export const launchService = new LaunchService();
