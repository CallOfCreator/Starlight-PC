import { join } from '@tauri-apps/api/path';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { Mod } from '$lib/features/mods/schema';
import type { Profile, UnifiedMod } from '$lib/features/profiles/schema';
import type { ProfileModChip } from './types';
import { showError } from '$lib/utils/toast';

export function buildUnifiedMods(profile: Profile, diskFiles: string[]): UnifiedMod[] {
	const managedFiles = new Set(profile.mods.map((mod) => mod.file).filter(Boolean));

	const unified: UnifiedMod[] = profile.mods
		.filter((mod) => mod.file && diskFiles.includes(mod.file))
		.map((mod) => ({
			source: 'managed' as const,
			mod_id: mod.mod_id,
			version: mod.version,
			file: mod.file!
		}));

	for (const file of diskFiles) {
		if (!managedFiles.has(file)) {
			unified.push({ source: 'custom' as const, file });
		}
	}

	return unified;
}

export function buildProfileModChips(unifiedMods: UnifiedMod[], modsMap: Map<string, Mod>): ProfileModChip[] {
	return unifiedMods.map((mod) => {
		if (mod.source === 'managed') {
			const modInfo = modsMap.get(mod.mod_id);
			return { id: mod.mod_id, name: modInfo?.name ?? mod.mod_id, source: 'managed' as const };
		}
		return { id: mod.file, name: mod.file, source: 'custom' as const };
	});
}

export function findUnifiedModByChip(chipId: string, source: 'managed' | 'custom', unifiedMods: UnifiedMod[]) {
	return unifiedMods.find((mod) =>
		source === 'managed' ? mod.source === 'managed' && mod.mod_id === chipId : mod.file === chipId
	);
}

export async function openProfileFolder(path: string) {
	try {
		await revealItemInDir(await join(path, 'BepInEx'));
	} catch (error) {
		showError(error, 'Open folder');
	}
}
