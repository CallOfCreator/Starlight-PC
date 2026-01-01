import { queryOptions } from '@tanstack/svelte-query';
import { epicService } from './epic-service';

export const epicQueries = {
	isLoggedIn: () =>
		queryOptions({
			queryKey: ['epic', 'isLoggedIn'] as const,
			queryFn: () => epicService.isLoggedIn()
		})
};
