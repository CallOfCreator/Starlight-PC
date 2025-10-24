<script lang="ts">
    import { page } from "$app/stores";
    import { TitlebarButtons } from "$lib/components/ui/titlebar-buttons";
    import {
        StarlightIcon,
        ArrowLeftIcon,
        ArrowRightIcon,
    } from "$lib/components/icons";
    import { Button } from "$lib/components/ui/button";

    // Get error status safely
    const errorStatus = $derived(($page.status as number) || 500);
    const errorMessage = $derived(
        $page.error?.message ||
            "An unexpected error occurred. Please try again later.",
    );
</script>

<div class="error-layout">
    <!-- Simple Titlebar -->
    <div
        data-tauri-drag-region
        class="titlebar bg-card h-12 flex items-center border-b border-border"
    >
        <div data-tauri-drag-region class="flex items-center gap-2 p-3">
            <StarlightIcon
                class="pointer-events-none h-5 w-5 text-foreground"
            />
            <span class="text-sm font-medium">Starlight</span>
            <div
                data-tauri-drag-region-exclude
                class="ml-3 flex items-center gap-1"
            >
                <Button
                    variant="navigation"
                    aria-label="Go back"
                    onclick={() => history.back()}
                >
                    <ArrowLeftIcon />
                </Button>
                <Button
                    variant="navigation"
                    aria-label="Go forward"
                    onclick={() => history.forward()}
                >
                    <ArrowRightIcon />
                </Button>
            </div>
        </div>
        <div class="ml-auto">
            <TitlebarButtons />
        </div>
    </div>

    <!-- Error Content -->
    <div class="error-content flex items-center justify-center p-8">
        <div
            class="error-card bg-card border border-border rounded-lg p-8 max-w-2xl w-full shadow-lg"
        >
            <div class="text-center mb-6">
                <h1 class="text-6xl font-bold text-destructive mb-2">
                    {errorStatus}
                </h1>
                <h2 class="text-2xl font-semibold text-foreground mb-4">
                    {errorStatus === 404
                        ? "Page Not Found"
                        : "Oops! Something went wrong"}
                </h2>
            </div>

            <div class="text-center mb-6">
                <p class="text-muted-foreground text-base">
                    {errorMessage}
                </p>
            </div>

            {#if errorStatus === 404}
                <div class="text-center">
                    <Button href="/" variant="default" size="default">
                        Go back home
                    </Button>
                </div>
            {:else}
                <div class="flex gap-3 justify-center">
                    <Button
                        variant="outline"
                        size="default"
                        onclick={() => window.history.back()}
                    >
                        Go back
                    </Button>
                    <Button href="/" variant="default" size="default">
                        Go home
                    </Button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .error-layout {
        height: 100vh;
        width: 100vw;
        display: flex;
        flex-direction: column;
        background-color: var(--background);
        overflow: hidden;
    }

    .titlebar {
        flex-shrink: 0;
    }

    .error-content {
        flex: 1;
        overflow-y: auto;
    }

    :global([data-tauri-drag-region]) {
        -webkit-app-region: drag;
    }

    :global([data-tauri-drag-region-exclude]) {
        -webkit-app-region: no-drag;
    }
</style>
