import { writeFile, mkdir, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { apiFetch } from '$lib/api/client';
import {
	ModVersionInfo as ModVersionInfoSchema,
	ModVersion,
	ModResponse,
	type ModVersionInfo,
	type ModDependency
} from '../mods/schema';
import { type } from 'arktype';
import * as semver from 'semver';

const ModVersionsArray = type(ModVersion.array());
const ModVersionInfoValidator = type(ModVersionInfoSchema);

/** Default timeout for mod downloads (30 seconds) */
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface DependencyWithMeta extends ModDependency {
	modName: string;
	resolvedVersion: string;
}

class ModInstallService {
	async getModVersions(modId: string): Promise<ModVersion[]> {
		return await apiFetch(`/api/v2/mods/${modId}/versions`, ModVersionsArray);
	}

	async getModVersionInfo(modId: string, version: string): Promise<ModVersionInfo> {
		return await apiFetch(
			`/api/v2/mods/${modId}/versions/${version}/info`,
			ModVersionInfoValidator
		);
	}

	async getModById(modId: string): Promise<typeof ModResponse.infer> {
		return await apiFetch(`/api/v2/mods/${modId}`, ModResponse);
	}

	/**
	 * Resolves dependencies with their mod names and latest matching versions
	 */
	async resolveDependencies(dependencies: ModDependency[]): Promise<DependencyWithMeta[]> {
		const resolved: DependencyWithMeta[] = [];

		for (const dep of dependencies) {
			try {
				const [mod, versions] = await Promise.all([
					this.getModById(dep.mod_id),
					this.getModVersions(dep.mod_id)
				]);

				// Find the latest version that satisfies the constraint
				const sortedVersions = [...versions].sort((a, b) => b.created_at - a.created_at);
				let resolvedVersion = sortedVersions[0]?.version ?? '';

				// Try to find a version matching the constraint using semver
				if (dep.version_constraint && dep.version_constraint !== '*') {
					for (const v of sortedVersions) {
						try {
							if (semver.satisfies(v.version, dep.version_constraint)) {
								resolvedVersion = v.version;
								break;
							}
						} catch {
							// If semver parsing fails, fall back to latest
						}
					}
				}

				resolved.push({
					...dep,
					modName: mod.name,
					resolvedVersion
				});
			} catch {
				// If we can't resolve a dependency, skip it
				console.warn(`Failed to resolve dependency: ${dep.mod_id}`);
			}
		}

		return resolved;
	}

	async installModToProfile(modId: string, version: string, profilePath: string): Promise<string> {
		const info = await this.getModVersionInfo(modId, version);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

		let response: Response;
		try {
			response = await fetch(info.download_url, { signal: controller.signal });
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				throw new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS / 1000} seconds`);
			}
			throw err;
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

		const data = new Uint8Array(await response.arrayBuffer());

		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

		if (hashHex !== info.checksum) {
			throw new Error(`Checksum mismatch: expected ${info.checksum}, got ${hashHex}`);
		}

		const pluginsDir = await join(profilePath, 'BepInEx', 'plugins');

		await mkdir(pluginsDir, { recursive: true });
		await writeFile(await join(pluginsDir, info.file_name), data);

		return info.file_name;
	}

	/**
	 * Installs multiple mods to a profile
	 * Returns an array of { modId, version, fileName } for successful installs
	 */
	async installModsToProfile(
		mods: Array<{ modId: string; version: string }>,
		profilePath: string
	): Promise<Array<{ modId: string; version: string; fileName: string }>> {
		const results: Array<{ modId: string; version: string; fileName: string }> = [];

		for (const mod of mods) {
			const fileName = await this.installModToProfile(mod.modId, mod.version, profilePath);
			results.push({ modId: mod.modId, version: mod.version, fileName });
		}

		return results;
	}

	async removeModFromProfile(fileName: string, profilePath: string): Promise<void> {
		const dllPath = await join(profilePath, 'BepInEx', 'plugins', fileName);
		await remove(dllPath);
	}
}

export const modInstallService = new ModInstallService();
