import type { QueryClient } from '@tanstack/svelte-query';
import { settingsRepository } from './settings-repository';
import type { AppSettings } from './schema';
import { settingsQueryKey } from './settings-keys';

export const settingsMutations = {
	update: (queryClient: QueryClient) => ({
		mutationFn: (settings: Partial<AppSettings>) => settingsRepository.update(settings),
		onSuccess: (_data: void, variables: Partial<AppSettings>) => {
			queryClient.setQueryData<AppSettings | undefined>(settingsQueryKey, (current) => {
				if (!current) return current;
				return { ...current, ...variables };
			});
		}
	})
};
