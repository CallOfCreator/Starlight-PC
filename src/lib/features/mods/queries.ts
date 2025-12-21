import { queryOptions } from '@tanstack/svelte-query';
import { type } from 'arktype';
import { apiFetch } from '$lib/api/client';
import { ModResponse, ModInfoResponse } from './schema';

export const modQueries = {
	all: () =>
		queryOptions({
			queryKey: ['mods', 'list'] as const,
			queryFn: () => apiFetch('/api/v2/mods', type(ModResponse.array())),
			staleTime: 1000 * 60 * 5
		}),

	trending: () =>
		queryOptions({
			queryKey: ['mods', 'trending'] as const,
			queryFn: () => apiFetch('/api/v2/mods/trending', type(ModResponse.array())),
			staleTime: 1000 * 60 * 5
		}),

	// Fetches the detailed info for a specific mod
	info: (id: string) =>
		queryOptions({
			queryKey: ['mods', 'info', id] as const,
			queryFn: () => apiFetch(`/api/v2/mods/${id}/info`, ModInfoResponse),
			staleTime: 1000 * 60 * 15 // Info changes less often than download counts
		}),

	// If you need the base mod data and info together
	detail: (id: string) =>
		queryOptions({
			queryKey: ['mods', 'detail', id] as const,
			queryFn: () => apiFetch(`/api/v2/mods/${id}`, ModResponse),
			staleTime: 1000 * 60 * 5
		})
};
