import type { ResolvedDependency } from './types';

export function buildInitialDependencySelection(dependencies: ResolvedDependency[]): Set<string> {
	return new Set(dependencies.filter((dep) => dep.type !== 'conflict').map((dep) => dep.mod_id));
}

export function toggleDependencySelection(selected: Set<string>, modId: string): Set<string> {
	if (selected.has(modId)) {
		return new Set([...selected].filter((id) => id !== modId));
	}
	return new Set([...selected, modId]);
}
