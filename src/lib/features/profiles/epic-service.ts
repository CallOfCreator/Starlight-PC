import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';

class EpicService {
	async isLoggedIn(): Promise<boolean> {
		try {
			return await invoke<boolean>('epic_is_logged_in');
		} catch {
			return false;
		}
	}

	async login(code: string): Promise<void> {
		await invoke('epic_login_with_code', { code });
	}

	async logout(): Promise<void> {
		await invoke('epic_logout');
	}

	async getAuthUrl(): Promise<string> {
		return await invoke<string>('get_epic_auth_url');
	}

	async ensureLoggedIn(): Promise<void> {
		const restored = await invoke<boolean>('epic_try_restore_session');
		if (!restored) {
			throw new Error('Not logged into Epic Games');
		}
	}

	async getStore(): Promise<Store> {
		return await Store.load('registry.json');
	}
}

export const epicService = new EpicService();
