import { debug, info } from '@tauri-apps/plugin-log';
import { type } from 'arktype';
import { getStore } from '$lib/state/store';
import { Settings, type AppSettings } from './schema';

export const DEFAULT_SETTINGS: AppSettings = {
	bepinex_url:
		'https://builds.bepinex.dev/projects/bepinex_be/752/BepInEx-Unity.IL2CPP-win-x86-6.0.0-be.752%2Bdd0655f.zip',
	among_us_path: '',
	close_on_launch: false,
	allow_multi_instance_launch: false,
	game_platform: 'steam',
	cache_bepinex: false
};

class SettingsRepository {
	async get(): Promise<AppSettings> {
		const store = await getStore();
		const raw = await store.get('settings');

		if (!raw) {
			debug('No settings found, using defaults');
			return DEFAULT_SETTINGS;
		}

		const result = Settings({ ...DEFAULT_SETTINGS, ...raw });
		if (result instanceof type.errors) {
			debug('Invalid settings data, using defaults');
			return DEFAULT_SETTINGS;
		}

		return result;
	}

	async update(updates: Partial<AppSettings>): Promise<void> {
		info(`Updating settings: ${Object.keys(updates).join(', ')}`);
		const store = await getStore();
		const current = await this.get();
		await store.set('settings', { ...current, ...updates });
		await store.save();
		debug('Settings saved');
	}
}

export const settingsRepository = new SettingsRepository();
