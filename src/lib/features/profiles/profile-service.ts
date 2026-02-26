import { mkdir, remove, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getStore } from '$lib/state/store';
import { info, warn, error as logError, debug } from '@tauri-apps/plugin-log';
import { type } from 'arktype';
import { ProfileEntry, type Profile, type UnifiedMod, type BepInExProgress } from './schema';
import { settingsService } from '../settings/settings-service';
import { gameState, invalidateProfiles } from './game-state.svelte';
import { showError } from '$lib/utils/toast';

// Used only for one-time migration of legacy registry.json data
const ProfilesArray = type(ProfileEntry.array());

class ProfileService {
	/** Once migration has been attempted, skip legacy store lookups entirely. */
	private migrationDone = false;

	// ---------------------------------------------------------------------------
	// Metadata helpers — profiles directory is the source of truth
	// ---------------------------------------------------------------------------

	/** Returns the path to the top-level profiles directory. */
	async getProfilesDir(): Promise<string> {
		const dataDir = await this.getAppDataDir();
		return await join(dataDir, 'profiles');
	}

	private async getMetadataPath(profileDir: string): Promise<string> {
		return await join(profileDir, 'metadata.json');
	}

	/** Reads and validates metadata.json for a profile directory. Returns null on any error. */
	private async readMetadata(profileDir: string): Promise<Profile | null> {
		try {
			const metadataPath = await this.getMetadataPath(profileDir);
			const content = await readTextFile(metadataPath);
			const raw = JSON.parse(content);
			// Always override stored path with actual directory location
			const result = ProfileEntry({ ...raw, path: profileDir });
			if (result instanceof type.errors) {
				warn(`ProfileEntry validation failed for ${profileDir}: ${result.summary}`);
				return null;
			}
			return result;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			warn(`Failed to read metadata for ${profileDir}: ${msg}`);
			return null;
		}
	}

	/** Writes the profile to its metadata.json file. */
	private async writeMetadata(profile: Profile): Promise<void> {
		const metadataPath = await this.getMetadataPath(profile.path);
		await writeTextFile(metadataPath, JSON.stringify(profile, null, 2));
	}

	// ---------------------------------------------------------------------------
	// Read operations
	// ---------------------------------------------------------------------------

	async getProfiles(): Promise<Profile[]> {
		const profilesDir = await this.getProfilesDir();
		await mkdir(profilesDir, { recursive: true });

		let entries: Awaited<ReturnType<typeof readDir>>;
		try {
			entries = await readDir(profilesDir);
		} catch {
			debug('Failed to read profiles directory');
			return [];
		}

		debug(`getProfiles: found ${entries.length} entries in ${profilesDir}`);

		// Load legacy profiles from registry.json for one-time migration.
		// Once attempted, skip entirely on subsequent calls.
		let legacyMap: Map<string, Profile> | null = null;
		if (!this.migrationDone) {
			const store = await getStore();
			const rawLegacy = await store.get('profiles');
			const legacyResult = ProfilesArray(rawLegacy ?? []);
			const legacyProfiles = legacyResult instanceof type.errors ? [] : legacyResult;

			if (legacyProfiles.length > 0) {
				legacyMap = new Map(legacyProfiles.map((p) => [p.id, p]));
				debug(`getProfiles: found ${legacyProfiles.length} legacy profiles to migrate`);
			} else {
				// No legacy data — migration is done (or was never needed)
				this.migrationDone = true;
			}
		}

		let migratedCount = 0;
		const profiles: Profile[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory) continue;

			const profileDir = await join(profilesDir, entry.name);
			let profile = await this.readMetadata(profileDir);

			if (!profile && legacyMap) {
				// Attempt one-time migration from legacy registry
				const legacy = legacyMap.get(entry.name);
				if (legacy) {
					profile = { ...legacy, path: profileDir };
					await this.writeMetadata(profile);
					migratedCount++;
					info(`Migrated profile ${entry.name} to metadata.json`);
				}
			}

			if (!profile) {
				debug(`Skipping profile dir without metadata: ${entry.name}`);
				continue;
			}

			profiles.push(profile);
		}

		// Clear legacy registry entry once all profiles have been migrated
		if (legacyMap && migratedCount > 0) {
			const allMigrated = [...legacyMap.keys()].every((id) => profiles.some((p) => p.id === id));
			if (allMigrated) {
				const store = await getStore();
				await store.set('profiles', []);
				await store.save();
				this.migrationDone = true;
				info('All profiles migrated to metadata.json — cleared legacy registry entry');
			}
		} else if (legacyMap && migratedCount === 0) {
			// Legacy data exists but no dirs matched — nothing to migrate
			this.migrationDone = true;
		}

		debug(`getProfiles: returning ${profiles.length} profiles`);
		return profiles.sort((a, b) => {
			const aLaunched = a.last_launched_at ?? 0;
			const bLaunched = b.last_launched_at ?? 0;
			if (aLaunched !== bLaunched) return bLaunched - aLaunched;
			return b.created_at - a.created_at;
		});
	}

	async getProfileById(id: string): Promise<Profile | undefined> {
		// Direct lookup by id (= directory name) — much cheaper than scanning all profiles
		const profilesDir = await this.getProfilesDir();
		const profileDir = await join(profilesDir, id);
		const metadata = await this.readMetadata(profileDir);
		return metadata ?? undefined;
	}

	// ---------------------------------------------------------------------------
	// Write operations — all persist to metadata.json
	// ---------------------------------------------------------------------------

	async createProfile(name: string): Promise<Profile> {
		const trimmed = name.trim();
		if (!trimmed) {
			logError('Attempted to create profile with empty name');
			throw new Error('Profile name cannot be empty');
		}

		info(`Creating profile: ${trimmed}`);
		const profiles = await this.getProfiles();

		if (profiles.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			warn(`Profile '${trimmed}' already exists`);
			throw new Error(`Profile '${trimmed}' already exists`);
		}

		const profilesDir = await this.getProfilesDir();
		const timestamp = Date.now();
		const slug = this.slugify(trimmed);
		const profileId = slug ? `${slug}-${timestamp}` : `profile-${timestamp}`;
		const profilePath = await join(profilesDir, profileId);

		await mkdir(profilePath, { recursive: true });
		debug(`Created profile directory: ${profilePath}`);

		const profile: Profile = {
			id: profileId,
			name: trimmed,
			path: profilePath,
			created_at: timestamp,
			last_launched_at: undefined,
			bepinex_installed: false,
			total_play_time: 0,
			mods: []
		};

		await this.writeMetadata(profile);
		info(`Profile created: ${profileId}`);

		this.installBepInExInBackground(profileId, profilePath).catch((err) => {
			logError(`installBepInExInBackground failed: ${err instanceof Error ? err.message : err}`);
			showError(err, 'BepInEx installation');
		});

		return profile;
	}

	private async installBepInExInBackground(profileId: string, profilePath: string): Promise<void> {
		info(`Installing BepInEx for profile: ${profileId}`);
		const bepinexUrl = await this.getBepInExUrl();

		try {
			await this.downloadBepInEx(profilePath, bepinexUrl, (progress) => {
				gameState.setBepInExProgress(profileId, progress);
			});

			const profile = await this.getProfileById(profileId);
			if (profile) {
				profile.bepinex_installed = true;
				await this.writeMetadata(profile);
				info(`BepInEx installed for profile: ${profileId}`);
				invalidateProfiles();
			}
			gameState.clearBepInExProgress(profileId);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			logError(`BepInEx installation failed for profile ${profileId}: ${message}`);
			gameState.setBepInExError(profileId, message);
			showError(err, 'BepInEx installation');
		}
	}

	async retryBepInExInstall(profileId: string, profilePath: string): Promise<void> {
		gameState.clearBepInExProgress(profileId);
		await this.installBepInExInBackground(profileId, profilePath);
	}

	private async downloadBepInEx(
		profilePath: string,
		bepinexUrl: string,
		onProgress?: (progress: BepInExProgress) => void
	): Promise<void> {
		let unlisten: UnlistenFn | undefined;

		try {
			if (onProgress) {
				unlisten = await listen<BepInExProgress>('bepinex-progress', (event) => {
					onProgress(event.payload);
				});
			}

			const settings = await settingsService.getSettings();
			const cachePath = settings.cache_bepinex ? await settingsService.getBepInExCachePath() : null;

			await invoke('install_bepinex', {
				url: bepinexUrl,
				destination: profilePath,
				cachePath
			});
		} finally {
			unlisten?.();
		}
	}

	async deleteProfile(profileId: string): Promise<void> {
		info(`Deleting profile: ${profileId}`);
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		// Clear any install progress/error state
		gameState.clearBepInExProgress(profileId);

		// Removing the directory is the only operation needed —
		// the profiles dir watcher will detect the removal and invalidate the query.
		await remove(profile.path, { recursive: true });
		info(`Profile deleted: ${profileId}`);
	}

	async renameProfile(profileId: string, newName: string): Promise<void> {
		const trimmed = newName.trim();
		if (!trimmed) {
			logError('Attempted to rename profile to empty name');
			throw new Error('Profile name cannot be empty');
		}

		info(`Renaming profile ${profileId} to: ${trimmed}`);
		const profiles = await this.getProfiles();
		const profile = profiles.find((p) => p.id === profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		if (
			profiles.some((p) => p.id !== profileId && p.name.toLowerCase() === trimmed.toLowerCase())
		) {
			warn(`Profile name '${trimmed}' already exists`);
			throw new Error(`Profile '${trimmed}' already exists`);
		}

		profile.name = trimmed;
		await this.writeMetadata(profile);
		info(`Profile renamed: ${profileId} -> ${trimmed}`);
	}

	async getActiveProfile(): Promise<Profile | null> {
		const profiles = await this.getProfiles();
		const profilesWithLaunched = profiles.filter((p) => p.last_launched_at !== undefined);

		if (profilesWithLaunched.length === 0) return null;

		return profilesWithLaunched.reduce((latest, profile) => {
			const latestTime = latest.last_launched_at ?? 0;
			const profileTime = profile.last_launched_at ?? 0;
			return profileTime > latestTime ? profile : latest;
		});
	}

	async updateLastLaunched(profileId: string): Promise<void> {
		const profile = await this.getProfileById(profileId);
		if (profile) {
			profile.last_launched_at = Date.now();
			await this.writeMetadata(profile);
			debug(`Updated last_launched for profile: ${profileId}`);
		}
	}

	async addModToProfile(
		profileId: string,
		modId: string,
		version: string,
		file: string
	): Promise<void> {
		info(`Adding mod ${modId} v${version} to profile ${profileId}`);
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		const modIndex = profile.mods.findIndex((m) => m.mod_id === modId);
		if (modIndex >= 0) {
			profile.mods[modIndex] = { mod_id: modId, version, file };
			debug(`Updated existing mod ${modId} in profile ${profileId}`);
		} else {
			profile.mods.push({ mod_id: modId, version, file });
			debug(`Added new mod ${modId} to profile ${profileId}`);
		}

		await this.writeMetadata(profile);
	}

	async addPlayTime(profileId: string, durationMs: number): Promise<void> {
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		profile.total_play_time = (profile.total_play_time ?? 0) + durationMs;
		await this.writeMetadata(profile);
		debug(`Added ${durationMs}ms play time to profile ${profileId}`);
	}

	async removeModFromProfile(profileId: string, modId: string): Promise<void> {
		info(`Removing mod ${modId} from profile ${profileId}`);
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		profile.mods = profile.mods.filter((m) => m.mod_id !== modId);
		await this.writeMetadata(profile);
	}

	async getModFiles(profilePath: string): Promise<string[]> {
		try {
			const pluginsPath = await join(profilePath, 'BepInEx', 'plugins');
			const entries = await readDir(pluginsPath);
			return entries.map((entry) => entry.name);
		} catch {
			return [];
		}
	}

	async countMods(profilePath: string): Promise<number> {
		try {
			const pluginsPath = await join(profilePath, 'BepInEx', 'plugins');
			const entries = await readDir(pluginsPath);
			return entries.length;
		} catch {
			return 0;
		}
	}

	async deleteModFile(profilePath: string, fileName: string): Promise<void> {
		info(`Deleting mod file: ${fileName}`);
		const pluginsPath = await join(profilePath, 'BepInEx', 'plugins');
		const filePath = await join(pluginsPath, fileName);
		await remove(filePath, { recursive: true });
	}

	async getUnifiedMods(profileId: string): Promise<UnifiedMod[]> {
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		const diskFiles = await this.getModFiles(profile.path);
		const diskFilesSet = new Set(diskFiles);
		const managedFiles = new Set<string>();

		const unified: UnifiedMod[] = profile.mods
			.filter((m) => m.file)
			.filter((m) => {
				managedFiles.add(m.file!);
				return diskFilesSet.has(m.file!);
			})
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

		await this.cleanupMissingManagedMods(profileId, profile, diskFilesSet);

		return unified;
	}

	private async cleanupMissingManagedMods(
		profileId: string,
		profile: Profile,
		diskFiles: Set<string>
	): Promise<void> {
		const missingMods = profile.mods.filter((m) => m.file && !diskFiles.has(m.file));

		if (missingMods.length > 0) {
			info(`Cleaning up ${missingMods.length} missing managed mods from profile ${profileId}`);
			profile.mods = profile.mods.filter((m) => m.file && diskFiles.has(m.file));
			await this.writeMetadata(profile);
			debug(`Removed missing mods from profile ${profileId}`);
		}
	}

	async cleanupMissingMods(profileId: string): Promise<void> {
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		const diskFiles = await this.getModFiles(profile.path);
		const diskFilesSet = new Set(diskFiles);

		const missingMods = profile.mods.filter((m) => m.file && !diskFilesSet.has(m.file));
		if (missingMods.length > 0) {
			info(`Cleaning up ${missingMods.length} missing managed mods from profile ${profileId}`);
			profile.mods = profile.mods.filter((m) => m.file && diskFilesSet.has(m.file));
			await this.writeMetadata(profile);
			debug(`Removed missing mods from profile ${profileId}`);
		}
	}

	async deleteUnifiedMod(profileId: string, mod: UnifiedMod): Promise<void> {
		const profile = await this.getProfileById(profileId);

		if (!profile) {
			logError(`Profile not found: ${profileId}`);
			throw new Error(`Profile '${profileId}' not found`);
		}

		await this.deleteModFile(profile.path, mod.file);

		if (mod.source === 'managed') {
			await this.removeModFromProfile(profileId, mod.mod_id);
		}
	}

	private slugify(input: string): string {
		return input
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}

	private async getAppDataDir(): Promise<string> {
		const { appDataDir } = await import('@tauri-apps/api/path');
		return await appDataDir();
	}

	private async getBepInExUrl(): Promise<string> {
		const settings = await settingsService.getSettings();
		return settings.bepinex_url;
	}
}

export const profileService = new ProfileService();
