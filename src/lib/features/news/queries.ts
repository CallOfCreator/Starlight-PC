import { queryOptions } from '@tanstack/svelte-query';
import { type } from 'arktype';
import { apiFetch } from '$lib/api/client';
import { NewsItem } from './schema';

export const newsQueries = {
	all: () =>
		queryOptions({
			queryKey: ['news'] as const,
			queryFn: () => apiFetch('/api/v2/news/posts', type(NewsItem.array())),
			staleTime: 1000 * 60 * 5
		}),
	byId: (id: string | number) =>
		queryOptions({
			queryKey: ['news', id] as const,
			queryFn: () => apiFetch(`/api/v2/news/posts/${id}`, NewsItem),
			staleTime: 1000 * 60 * 5
		})
};
