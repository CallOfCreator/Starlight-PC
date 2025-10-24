<script lang="ts">
    import "../app.css";
    import { browser } from "$app/environment";
    import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                enabled: browser,
            },
        },
    });
    let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
    {@render children?.()}
</QueryClientProvider>
