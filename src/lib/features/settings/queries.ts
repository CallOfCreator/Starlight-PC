import { queryOptions } from '@tanstack/svelte-query';
import { settingsRepository } from './settings-repository';
import { settingsQueryKey } from './settings-keys';

export const settingsQueries = {
	get: () =>
		queryOptions({
			queryKey: settingsQueryKey,
			queryFn: () => settingsRepository.get()
		})
};
