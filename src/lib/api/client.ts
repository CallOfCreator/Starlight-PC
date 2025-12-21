import { PUBLIC_API_URL } from '$env/static/public';

export async function apiFetch<T>(
	path: string,
	validator: { assert: (data: unknown) => T }
): Promise<T> {
	const response = await fetch(`${PUBLIC_API_URL}${path}`);

	if (!response.ok) {
		throw new Error(`HTTP error: ${response.statusText}`);
	}

	const jsonData = await response.json();
	return validator.assert(jsonData);
}
