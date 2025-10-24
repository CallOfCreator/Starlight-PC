<script lang="ts">
    // This page intentionally does NOT use useSidebar
    // to demonstrate automatic sidebar collapse
</script>

<div class="p-8">
    <h1 class="text-4xl font-bold mb-6">Library</h1>

    <div class="mb-6">
        <p class="text-muted-foreground">
            This page has no sidebar content, so the sidebar automatically
            collapses.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-4">
        <div
            class="border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors"
        >
            <h3 class="text-lg font-semibold mb-2">Local Modpacks</h3>
            <p class="text-sm text-muted-foreground">
                Browse and manage your installed modpacks
            </p>
        </div>

        <div
            class="border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors"
        >
            <h3 class="text-lg font-semibold mb-2">Saved Configurations</h3>
            <p class="text-sm text-muted-foreground">
                Access your saved world configurations and settings
            </p>
        </div>

        <div
            class="border border-border rounded-lg p-6 hover:bg-accent/50 transition-colors"
        >
            <h3 class="text-lg font-semibold mb-2">Downloads</h3>
            <p class="text-sm text-muted-foreground">
                View your download history and manage cached files
            </p>
        </div>
    </div>
</div>
