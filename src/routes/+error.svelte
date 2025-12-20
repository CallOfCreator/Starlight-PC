<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { House, MoveLeft, RefreshCcw, CircleAlert } from '@lucide/svelte';

	// Svelte 5 reactive derivations for the error details
	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'An unexpected error occurred');

	const is404 = $derived(status === 404);

	function handleRefresh() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{status} - {is404 ? 'Page Not Found' : 'Error'}</title>
</svelte:head>

<div
	class="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden p-8"
>
	<!-- Subtle Background Pattern -->
	<div
		class="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-zinc-950 dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
	></div>

	<div class="mx-auto flex max-w-[500px] flex-col items-center text-center">
		<!-- Error Icon / Code -->
		<div class="relative mb-8">
			<div class="absolute -inset-4 rounded-full bg-primary/10 blur-2xl"></div>
			<div
				class="relative flex h-32 w-32 items-center justify-center rounded-full border bg-background shadow-sm"
			>
				{#if is404}
					<span class="text-5xl font-bold tracking-tighter text-primary">404</span>
				{:else}
					<CircleAlert class="h-16 w-16 text-destructive" />
				{/if}
			</div>
		</div>

		<!-- Text Content -->
		<div class="space-y-4">
			<h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl">
				{is404 ? "We've lost this page" : 'Something went wrong'}
			</h1>
			<p class="text-xl text-muted-foreground">
				{#if is404}
					Sorry, the page you are looking for doesn't exist or has been moved.
				{:else}
					{message}
				{/if}
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="mt-10 flex flex-wrap items-center justify-center gap-4">
			<Button variant="outline" size="lg" onclick={() => history.back()} class="gap-2">
				<MoveLeft class="h-4 w-4" />
				Go Back
			</Button>

			{#if !is404}
				<Button variant="secondary" size="lg" onclick={handleRefresh} class="gap-2">
					<RefreshCcw class="h-4 w-4" />
					Try Again
				</Button>
			{/if}

			<Button size="lg" href="/" class="gap-2">
				<House class="h-4 w-4" />
				Back to Home
			</Button>
		</div>

		<!-- Technical Details (Optional/Debug) -->
		{#if !is404}
			<div class="mt-12 w-full rounded-lg border bg-muted/50 p-4 text-left">
				<p class="mb-2 font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase">
					Error Reference
				</p>
				<code class="block overflow-x-auto font-mono text-sm">
					Status: {status}<br />
					Timestamp: {new Date().toISOString()}
				</code>
			</div>
		{/if}
	</div>
</div>
