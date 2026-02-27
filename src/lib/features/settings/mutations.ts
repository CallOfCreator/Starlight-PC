import type { QueryClient } from '@tanstack/svelte-query';
import { settingsService } from './settings-service';
import type { AppSettings } from './schema';

export const settingsMutations = {
	update: (queryClient: QueryClient) => ({
		mutationFn: (settings: Partial<AppSettings>) => settingsService.updateSettings(settings),
		onSuccess: (_data: void, variables: Partial<AppSettings>) => {
			queryClient.setQueryData<AppSettings | undefined>(['settings'], (current) => {
				if (!current) return current;
				return { ...current, ...variables };
			});
		}
	})
};
