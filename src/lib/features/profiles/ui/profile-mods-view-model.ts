import type { Mod } from '$lib/features/mods/schema';
import type { UnifiedMod } from '$lib/features/profiles/schema';

export const PROFILE_MODS_PAGE_SIZE = 6;

function matchesSearch(mod: UnifiedMod, modsMap: Map<string, Mod>, searchLower: string): boolean {
	if (!searchLower) return true;
	if (mod.source === 'managed') {
		return modsMap.get(mod.mod_id)?.name.toLowerCase().includes(searchLower) ?? false;
	}
	return mod.file.toLowerCase().includes(searchLower);
}

export function filterProfileMods(unified: UnifiedMod[], modsMap: Map<string, Mod>, search: string) {
	const searchLower = search.trim().toLowerCase();
	return unified.filter((mod) => matchesSearch(mod, modsMap, searchLower));
}

export function paginateProfileMods(mods: UnifiedMod[], page: number, pageSize = PROFILE_MODS_PAGE_SIZE) {
	const start = page * pageSize;
	return mods.slice(start, start + pageSize);
}

export function getProfileModsPagination(total: number, page: number, pageSize = PROFILE_MODS_PAGE_SIZE) {
	const totalPages = Math.ceil(total / pageSize);
	const hasNextPage = page < totalPages - 1;
	return {
		totalPages,
		hasNextPage,
		showPagination: page > 0 || hasNextPage
	};
}
