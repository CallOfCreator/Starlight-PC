type InvalidateCallback = () => void;
let onProfilesInvalidate: InvalidateCallback | null = null;

export function registerProfilesInvalidateCallback(callback: InvalidateCallback) {
	onProfilesInvalidate = callback;
}

export function notifyProfilesInvalidated() {
	onProfilesInvalidate?.();
}
