import type { Mod } from '../schema';

export function mapModsById(mods: Array<Mod | undefined>): Map<string, Mod> {
	return new Map(mods.filter((mod): mod is Mod => mod !== undefined).map((mod) => [mod.id, mod]));
}

export function getDefaultSortOptions() {
	return [
		{ value: 'trending' as const, label: 'Trending' },
		{ value: 'latest' as const, label: 'Latest' }
	];
}
