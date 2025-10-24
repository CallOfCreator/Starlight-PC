<script lang="ts">
    import DOMPurify from "dompurify";

    interface Props {
        content: string | Promise<string>;
        class?: string;
    }

    let { content, class: className = "" }: Props = $props();

    const sanitizedContent = $derived.by(async () => {
        const resolvedContent = await Promise.resolve(content);
        return DOMPurify.sanitize(resolvedContent);
    });
</script>

<div
    class="prose dark:prose-invert prose-sm max-w-none
    prose-h1:scroll-m-20 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h1:lg:text-5xl
    prose-h2:scroll-m-20 prose-h2:border-b prose-h2:pb-2 prose-h2:text-3xl prose-h2:font-semibold prose-h2:tracking-tight prose-h2:transition-colors prose-h2:first:mt-0
    prose-h3:scroll-m-20 prose-h3:text-2xl prose-h3:font-semibold prose-h3:tracking-tight
    prose-h4:scroll-m-20 prose-h4:text-xl prose-h4:font-semibold prose-h4:tracking-tight
    prose-p:leading-7 prose-p:not-first:mt-6
    prose-blockquote:mt-6 prose-blockquote:border-l-2 prose-blockquote:pl-6 prose-blockquote:italic
    prose-ul:my-6 prose-ul:ml-6 prose-ul:list-disc prose-ul:[&>li]:mt-2
    prose-code:relative prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-semibold
    {className}"
>
    {#await sanitizedContent}
        <p class="text-muted-foreground">Loading content...</p>
    {:then html}
        {@html html}
    {:catch error}
        <p class="text-destructive">Error loading content: {error.message}</p>
    {/await}
</div>
