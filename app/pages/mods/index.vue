<template>
	<div class="relative min-h-screen">
		<!-- Background -->
		<div class="absolute inset-0 bg-cover bg-center" style="background-image: url('/img/bg.jpg');" />
		<div class="absolute inset-0 bg-black/50" />

		<div class="page-content relative flex flex-col gap-5 text-white px-4 pt-20 md:pt-30">
			<!-- Stats Header -->
			<div class="w-full max-w-6xl mx-auto">
				<div class="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
					<h1 class="text-3xl font-bold mb-4">
						Browse Mods
					</h1>
					<div class="flex flex-wrap gap-6 text-sm">
						<div class="flex items-center gap-2">
							<UIcon name="material-symbols:apps" class="size-6 text-primary" />
							<div>
								<p class="text-white/60">
									Total Mods
								</p>
								<p class="text-xl font-bold">
									{{ totalMods }}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<UIcon name="material-symbols:download" class="size-6 text-primary" />
							<div>
								<p class="text-white/60">
									Total Downloads
								</p>
								<p class="text-xl font-bold">
									{{ formatNumber(totalDownloads) }}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<UIcon name="material-symbols:schedule" class="size-6 text-primary" />
							<div>
								<p class="text-white/60">
									Last Updated
								</p>
								<p class="text-xl font-bold">
									{{ latestUpdate }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="flex flex-col md:flex-row gap-6 w-full max-w-6xl mx-auto">
				<!-- Left -->
				<div class="w-full md:w-64 flex flex-col gap-4">
					<div class="bg-white/10 p-4 rounded-lg text-white flex flex-col gap-2">
						<h3 class="text-lg font-semibold mb-2">
							Supported Platforms
						</h3>
						<UCheckboxGroup
							v-model="platformDefault"
							style="
                  --ui-border-accented: gray;
                  --ui-border-muted: gray;
                "
							variant="table"
							class="cursor-pointer [&_label]:cursor-pointer [&_input]:cursor-pointer"
							:items="platforms"
						/>
					</div>

					<div class="bg-white/10 p-4 rounded-lg text-white flex flex-col gap-2">
						<h3 class="text-lg font-semibold mb-2">
							Mod Type
						</h3>
						<URadioGroup
							v-model="defaultModType"
							style="
                  --ui-border-accented: gray;
                  --ui-border-muted: gray;
                  --ui-text-muted: #F5F5F5;"
							variant="table"
							class="cursor-pointer [&_label]:cursor-pointer [&_input]:cursor-pointer"
							:items="modTypes"
						/>
					</div>
				</div>

				<!-- Right -->
				<ul class="flex-1 space-y-3">
					<ModSearchList />
				</ul>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { CheckboxGroupItem, CheckboxGroupValue } from "@nuxt/ui";
	import type { Mod } from "~/types";
	import ModSearchList from "~/components/modspage/ModSearchList.vue";

	const config = useRuntimeConfig();

	const platforms = ref<CheckboxGroupItem[]>(["PC", "Android"]);
	const platformDefault = ref<CheckboxGroupValue[]>(["PC", "Android"]);
	const modTypes = ref<CheckboxGroupItem[]>([
		{
			label: "Client Required",
			description: "Everyone must have the mods installed to play.",
			value: "client"
		},
		{
			label: "Host Only",
			description: "Only the host needs the mods installed.",
			value: "host"
		},
		{
			label: "Client Sided",
			description: "Mods that only change your experience, and not others.",
			value: "local"
		}
	]);
	const defaultModType = ref<string>("client");

	// Fetch mods for statistics
	const { data: mods } = await useLazyFetch<Mod[]>("/api/v1/mods", {
		baseURL: config.public.apiUrl,
		default: () => [],
		server: false
	});

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	const totalMods = computed(() => mods.value?.length || 0);

	const totalDownloads = computed(() => {
		if (!mods.value) return 0;
		return mods.value.reduce((sum, mod) => sum + (mod.downloads || 0), 0);
	});

	const latestUpdate = computed(() => {
		if (!mods.value || mods.value.length === 0) return "N/A";

		const latestMod = mods.value.reduce((latest, mod) => {
			const modDate = mod.updated_at || mod.created_at;
			const latestDate = latest.updated_at || latest.created_at;

			if (!modDate) return latest;
			if (!latestDate) return mod;

			return modDate > latestDate ? mod : latest;
		});

		const dateValue = latestMod.updated_at || latestMod.created_at;
		if (!dateValue) return "N/A";

		const date = new Date(typeof dateValue === "number" ? dateValue : dateValue);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return "Today";
		if (diffInDays === 1) return "Yesterday";
		if (diffInDays < 7) return `${diffInDays} days ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	});
</script>
