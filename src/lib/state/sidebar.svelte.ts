import { setContext, getContext, type Snippet } from 'svelte';

class SidebarState {
	#content = $state<Snippet | null>(null);
	#isOpen = $state(false);
	#onCloseCallback: (() => void) | null = null;

	get content() {
		return this.#content;
	}
	get isOpen() {
		return this.#isOpen;
	}

	open(content: Snippet, onClose?: () => void) {
		this.#content = content;
		this.#isOpen = true;
		this.#onCloseCallback = onClose ?? null;
	}

	close() {
		this.#isOpen = false;
	}

	finalizeClose() {
		if (!this.#isOpen) {
			this.#content = null;
			this.#onCloseCallback?.();
			this.#onCloseCallback = null;
		}
	}
}

const SIDEBAR_KEY = Symbol('sidebar');

export function setSidebar() {
	const sidebar = new SidebarState();
	setContext(SIDEBAR_KEY, sidebar);
	return sidebar;
}

export function getSidebar() {
	const context = getContext<SidebarState>(SIDEBAR_KEY);
	if (!context) {
		throw new Error('getSidebar must be used within a sidebar context provider');
	}
	return context;
}

/**
 * Automatically opens the sidebar with the given snippet when the
 * component mounts, and closes it when the component unmounts.
 */
export function useSidebar(content: Snippet) {
	const sidebar = getSidebar();
	if (!sidebar) return;

	$effect(() => {
		sidebar.open(content);
		return () => sidebar.close();
	});
}
