<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import {
        MinimizeIcon,
        MaximizeIcon,
        RestoreIcon,
        CloseIcon,
    } from "$lib/components/icons";

    // Cache window instance to avoid repeated calls
    const currentWindow = getCurrentWindow();

    let isMaximized = $state(false);

    currentWindow.isMaximized().then((value) => (isMaximized = value));

    currentWindow.onResized(async () => {
        isMaximized = await currentWindow.isMaximized();
    });

    async function handleToggleMaximize() {
        await currentWindow.toggleMaximize();
        isMaximized = await currentWindow.isMaximized();
    }
</script>

<section
    class="flex items-center h-full"
    data-tauri-drag-region-exclude
>
    <Button
        variant="titlebar"
        onclick={() => currentWindow.minimize()}
        aria-label="Minimize window"
    >
        <MinimizeIcon />
    </Button>
    <Button
        variant="titlebar"
        onclick={handleToggleMaximize}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
    >
        {#if isMaximized}
            <RestoreIcon />
        {:else}
            <MaximizeIcon />
        {/if}
    </Button>
    <Button
        variant="titlebar-close"
        onclick={() => currentWindow.close()}
        aria-label="Close window"
    >
        <CloseIcon />
    </Button>
</section>
