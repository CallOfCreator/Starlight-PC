import type { Mod } from './schema';

class ModRegistry {
	private mods = $state(new Map<string, Mod>());

	add(mod: Mod) {
		// Only update if newer or doesn't exist
		const existing = this.mods.get(mod.id);
		if (!existing || mod.updated_at > existing.updated_at) {
			this.mods.set(mod.id, mod);
		}
	}

	addMany(mods: Mod[]) {
		mods.forEach((mod) => this.add(mod));
	}

	get all(): Mod[] {
		return Array.from(this.mods.values());
	}

	get size(): number {
		return this.mods.size;
	}

	get(id: string): Mod | undefined {
		return this.mods.get(id);
	}
}

export const modRegistry = new ModRegistry();
