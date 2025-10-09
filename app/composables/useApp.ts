// composables/useApp.ts
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { shallowRef } from "vue";

export const useApp = () => {
	// Use shallowRef to avoid deep reactivity on Store instance
	const store = shallowRef<Store | null>(null);
	const storeData = ref<Record<string, any>>({});

	const loadStoreData = async () => {
		if (!store.value) return;

		storeData.value = {
			initialized: await store.value.get<boolean>("initialized"),
			profiles: await store.value.get<any[]>("profiles"),
			active_profile: await store.value.get<string | null>("active_profile"),
			amongus_path: await store.value.get<string | null>("amongus_path"),
			base_game_setup: await store.value.get<boolean>("base_game_setup")
		};
	};

	const setupBaseGame = async () => {
		try {
			const message = await invoke<string>("setup_base_game");
			console.log(message);
			await loadStoreData();
			return true;
		} catch (error) {
			console.error("Base game setup failed:", error);
			throw error;
		}
	};

	const initApp = async () => {
		const message = await invoke<string>("init_app");
		console.log(message);

		store.value = await Store.load("registry.json");
		await loadStoreData();

		if (!storeData.value.base_game_setup) {
			console.log("Base game needs setup");
			await setupBaseGame();
		}

		return storeData.value;
	};

	const getAmongUsPath = async () => {
		return await invoke<string | null>("get_among_us_path_from_store");
	};

	const updateAmongUsPath = async (newPath: string) => {
		await invoke("update_among_us_path", { newPath });
		await store.value?.reload();
		await loadStoreData();
	};

	return {
		storeData,
		initApp,
		setupBaseGame,
		getAmongUsPath,
		updateAmongUsPath
	};
};
