import { invoke } from '@tauri-apps/api/core';

class EpicService {
	async isLoggedIn(): Promise<boolean> {
		return await invoke<boolean>('epic_is_logged_in');
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
}

export const epicService = new EpicService();
