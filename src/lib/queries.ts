import { PUBLIC_API_URL } from "$env/static/public";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const NewsItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  content: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

const TrendingModSchema = z.object({
  self: z.string(),
  mod_id: z.string(),
  mod_name: z.string(),
  author: z.string(),
  downloads: z.number(),
  thumbnail: z.string(),
  created_at: z.number(),
});

export type TrendingMod = z.infer<typeof TrendingModSchema>;

// ============================================================================
// Query Functions
// ============================================================================

async function fetchWithValidation<T>(
  url: string,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.statusText}`);
  }

  const jsonData = await response.json();
  return schema.parse(jsonData);
}

export async function fetchNews(): Promise<NewsItem[]> {
  return await fetchWithValidation(
    `${PUBLIC_API_URL}/api/v1/news`,
    z.array(NewsItemSchema),
  );
}

export function fetchNewsById(id: string | number): Promise<NewsItem> {
  return fetchWithValidation(
    `${PUBLIC_API_URL}/api/v1/news/${id}`,
    NewsItemSchema,
  );
}

export async function fetchTrendingMods(): Promise<TrendingMod[]> {
  return await fetchWithValidation(
    `${PUBLIC_API_URL}/api/v1/mods/trending`,
    z.array(TrendingModSchema),
  );
}
