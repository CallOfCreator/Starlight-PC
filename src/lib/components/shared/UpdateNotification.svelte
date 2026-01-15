<script lang="ts">
	import { updateState } from '$lib/features/updates/update-state.svelte';
	import { X, Download, Sparkles, LoaderCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	const isDownloading = $derived(updateState.status === 'downloading');
	const isInstalling = $derived(updateState.status === 'installing');
	const isBusy = $derived(isDownloading || isInstalling);
</script>

{#if updateState.isVisible && updateState.updateInfo}
	<div class="update-notification" class:downloading={isBusy}>
		<!-- Content -->
		<div class="notification-content">
			{#if isBusy}
				<!-- Downloading/Installing State -->
				<div class="status-row">
					<LoaderCircle class="h-4 w-4 animate-spin text-primary" />
					<span class="status-text">
						{#if isInstalling}
							Installing...
						{:else}
							Downloading... {updateState.progress.percent}%
						{/if}
					</span>
				</div>

				<!-- Progress bar -->
				<div class="progress-track">
					<div class="progress-fill" style:width="{updateState.progress.percent}%"></div>
				</div>
			{:else}
				<!-- Available State -->
				<div class="info-row">
					<Sparkles class="h-4 w-4 text-primary" />
					<span class="version-text">
						v{updateState.updateInfo.version} available
					</span>
				</div>

				<div class="action-row">
					<Button variant="ghost" size="sm" class="later-btn" onclick={() => updateState.dismiss()}>
						Later
					</Button>
					<Button size="sm" class="update-btn" onclick={() => updateState.install()}>
						<Download class="h-3.5 w-3.5" />
						Update
					</Button>
				</div>
			{/if}
		</div>

		<!-- Dismiss button (only when not busy) -->
		{#if !isBusy}
			<button
				class="dismiss-btn"
				onclick={() => updateState.dismiss()}
				aria-label="Dismiss update notification"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		{/if}
	</div>
{/if}

<style lang="postcss">
	@reference "$lib/../app.css";

	.update-notification {
		position: fixed;
		top: calc(var(--top-bar-height, 3rem) + 0.75rem);
		right: 0.75rem;
		z-index: 9999;

		display: flex;
		align-items: flex-start;
		gap: 0.5rem;

		min-width: 220px;
		padding: 0.75rem 1rem;

		background: var(--card-background);
		border: 1px solid oklch(1 0 0 / 0.08);
		border-radius: var(--radius-lg);

		box-shadow:
			0 4px 24px oklch(0 0 0 / 0.4),
			0 0 0 1px oklch(1 0 0 / 0.05) inset;

		/* Slide in animation */
		animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);

		&.downloading {
			min-width: 200px;
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	.notification-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	/* Available state */
	.info-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version-text {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--foreground);
		letter-spacing: -0.01em;
	}

	.action-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:global(.later-btn) {
		height: 1.75rem !important;
		padding: 0 0.625rem !important;
		font-size: 0.75rem !important;
		color: var(--muted-foreground) !important;

		&:hover {
			color: var(--foreground) !important;
			background: oklch(1 0 0 / 0.05) !important;
		}
	}

	:global(.update-btn) {
		height: 1.75rem !important;
		padding: 0 0.75rem !important;
		font-size: 0.75rem !important;
		gap: 0.375rem !important;

		background: linear-gradient(
			135deg,
			oklch(0.795 0.184 86.047) 0%,
			oklch(0.72 0.16 70) 100%
		) !important;
		color: oklch(0.2 0.05 60) !important;
		border: none !important;
		font-weight: 600 !important;

		&:hover {
			filter: brightness(1.1);
		}
	}

	/* Downloading state */
	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-text {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--foreground);
	}

	.progress-track {
		width: 100%;
		height: 4px;
		background: oklch(1 0 0 / 0.1);
		border-radius: 9999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, oklch(0.795 0.184 86.047) 0%, oklch(0.85 0.16 80) 100%);
		border-radius: inherit;
		transition: width 0.2s ease-out;
	}

	/* Dismiss button */
	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;

		width: 1.25rem;
		height: 1.25rem;
		margin-top: 0.125rem;

		color: var(--muted-foreground);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);

		opacity: 0.6;
		transition: all 0.15s ease;

		&:hover {
			opacity: 1;
			background: oklch(1 0 0 / 0.1);
			color: var(--foreground);
		}
	}
</style>
