import { toast } from 'svelte-sonner';

export function showToastError(message: string, description?: string) {
	toast.error(message, description ? { description } : undefined);
}

export function showToastSuccess(message: string, description?: string) {
	toast.success(message, description ? { description } : undefined);
}

export function showToastInfo(message: string, description?: string) {
	toast.info(message, description ? { description } : undefined);
}

export function showToastWarning(message: string, description?: string) {
	toast.warning(message, description ? { description } : undefined);
}
