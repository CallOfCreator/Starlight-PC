import { getContext, onMount } from "svelte";
import type { Snippet } from "svelte";

interface SidebarContext {
    setContent: (content: Snippet | null) => void;
}

/**
 * Hook to set sidebar content from a child page component
 * @param content - The snippet to render in the sidebar
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useSidebar } from "$lib/sidebar.svelte";
 *
 *   const { MySidebarContent } = $props();
 *
 *   useSidebar(MySidebarContent);
 * </script>
 *
 * {#snippet MySidebarContent()}
 *   <div class="p-4">
 *     <h3>Custom Sidebar</h3>
 *     <p>This content is from the page!</p>
 *   </div>
 * {/snippet}
 * ```
 */
export function useSidebar(content: Snippet | null) {
    const sidebar = getContext<SidebarContext>("sidebar");

    if (!sidebar) {
        console.warn("useSidebar: sidebar context not found. Make sure you're using this within a layout that provides the sidebar context.");
        return;
    }

    onMount(() => {
        sidebar.setContent(content);

        return () => {
            sidebar.setContent(null);
        };
    });
}
