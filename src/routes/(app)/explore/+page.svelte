<script lang="ts">
    import { useSidebar } from "$lib/sidebar.svelte";

    // Set custom sidebar content for the explore page
    useSidebar(ExploreSidebar);
</script>

{#snippet ExploreSidebar()}
    <div class="p-4 border-b border-border">
        <h3 class="text-base text-primary font-medium m-0">Explore Filters</h3>
        <p class="text-sm text-muted-foreground mt-2">Find the perfect mod</p>
    </div>
    <div class="p-4">
        <h3 class="text-sm font-medium mb-2">Categories</h3>
        <div class="space-y-2 text-sm">
            <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded" />
                <span>Roles</span>
            </label>
            <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded" />
                <span>Maps</span>
            </label>
            <label class="flex items-center gap-2">
                <input type="checkbox" class="rounded" />
                <span>Gamemodes</span>
            </label>
        </div>
    </div>
    <div class="p-4 border-t border-border">
        <h3 class="text-sm font-medium mb-2">Among Us Version</h3>
        <select
            class="w-full rounded border border-border bg-background px-2 py-1 text-sm"
        >
            <option>All Versions</option>
            <option>1.20.x</option>
            <option>1.19.x</option>
            <option>1.18.x</option>
        </select>
    </div>
{/snippet}

<div class="p-8">
    <h1 class="text-4xl font-bold mb-6">Explore Mods</h1>

    <div class="mb-6">
        <input
            type="search"
            placeholder="Search mods..."
            class="w-full max-w-md px-4 py-2 rounded-lg border border-border bg-background"
        />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(6) as _, i}
            <div
                class="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
                <div class="aspect-video bg-accent rounded mb-3"></div>
                <h3 class="font-semibold mb-1">Mod {i + 1}</h3>
                <p class="text-sm text-muted-foreground">
                    A sample mod description
                </p>
            </div>
        {/each}
    </div>
</div>
