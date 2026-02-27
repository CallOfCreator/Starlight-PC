import { showError } from '$lib/utils/toast';
import type { Profile } from '$lib/features/profiles/schema';

interface ShellControllerDeps {
	launchProfile: (profile: Profile) => Promise<void>;
	updateLastLaunched: (profileId: string) => Promise<void>;
}

export function getSidebarWidth(isMaximized: boolean): string {
	return isMaximized ? '100%' : '400px';
}

export function canLaunchProfile(activeProfile: Profile | null, running: boolean): boolean {
	return !running && !!activeProfile;
}

export function shouldFinalizeSidebarTransition(
	event: TransitionEvent,
	sidebarOpen: boolean
): boolean {
	return event.propertyName === 'width' && !sidebarOpen;
}

export function createShellController(deps: ShellControllerDeps) {
	return {
		async launchActiveProfile(activeProfile: Profile | null, running: boolean): Promise<void> {
			if (running) {
				showError(new Error('Among Us is already running'));
				return;
			}
			if (!activeProfile) return;

			try {
				await deps.launchProfile(activeProfile);
				await deps.updateLastLaunched(activeProfile.id);
			} catch (error) {
				showError(error);
			}
		}
	};
}
