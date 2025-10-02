<template>
	<NuxtLink :to="`/mods/${mod.mod_id}`" class="mod-card group">
		<img
			:src="`${config.public.apiUrl}${mod.thumbnail}`"
			alt="mod image"
			class="w-24 h-24 rounded-xl object-contain shadow-2xl bg-white/5 p-2 group-hover:scale-105 transition-transform duration-200"
		>

		<div class="flex flex-col gap-2 flex-1">
			<div>
				<h3 class="text-xl text-white break-words font-bold group-hover:text-primary transition-colors">
					{{ mod.mod_name }}
				</h3>
				<span class="text-sm text-white/70">
					by {{ mod.author }}
				</span>
			</div>

			<div class="flex flex-wrap items-center gap-3 text-white/60 text-sm">
				<div class="flex items-center gap-1">
					<UIcon
						name="material-symbols:download"
						class="size-4"
					/>
					<span>{{ formatNumber(mod.downloads ?? 0) }} downloads</span>
				</div>
				<div class="flex items-center gap-1">
					<UIcon
						name="material-symbols:sync-outline"
						class="size-4"
					/>
					<span>Updated {{ formatTimeAgo(mod.updated_at ?? mod.created_at) }}</span>
				</div>
			</div>

			<p class="text-white/80 text-sm break-words line-clamp-2">
				{{ mod.description || "No description available." }}
			</p>
		</div>
	</NuxtLink>
</template>

<script setup lang="ts">
	import type { Mod } from "~/types";

	defineProps<{
		mod: Mod
	}>();

	const config = useRuntimeConfig();

	const formatNumber = (num: number) => {
		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	const formatTimeAgo = (dateInput: string | number | Date | undefined | null) => {
		if (dateInput === undefined || dateInput === null) {
			return "unknown";
		}

		let date: Date;

		if (dateInput instanceof Date) {
			date = dateInput;
		} else if (typeof dateInput === "number") {
			date = new Date(dateInput);
		} else {
			const trimmed = dateInput.trim();
			const asNumber = Number(trimmed);

			date = Number.isFinite(asNumber) ? new Date(asNumber) : new Date(trimmed);
		}

		if (Number.isNaN(date.getTime())) {
			return "unknown";
		}

		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) {
			return "today";
		} else if (diffInDays === 1) {
			return "1 day ago";
		} else if (diffInDays < 7) {
			return `${diffInDays} days ago`;
		} else {
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric"
			});
		}
	};
</script>
