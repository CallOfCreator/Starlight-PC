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
  // Temporarily return mock data + real data
  const realData = await fetchWithValidation(
    `${PUBLIC_API_URL}/news`,
    z.array(NewsItemSchema),
  );

  const mockData: NewsItem[] = [
    {
      id: 2,
      title: "New Features Coming Soon!",
      author: "DevTeam",
      content:
        "## Exciting Updates\n\nWe're working on some amazing new features including:\n- Enhanced mod support\n- Better performance\n- New UI improvements\n\nStay tuned for more updates!",
      created_at: Date.now() - 86400000,
      updated_at: Date.now() - 43200000,
    },
    {
      id: 3,
      title: "Community Spotlight",
      author: "CommunityManager",
      content:
        "## Thank You!\n\nA huge shoutout to our amazing community for all the support and feedback. You make Starlight better every day!",
      created_at: Date.now() - 172800000,
      updated_at: Date.now() - 172800000,
    },
    {
      id: 4,
      title: "Bug Fixes and Improvements",
      author: "XtraCube",
      content:
        "## Patch Notes\n\n- Fixed crash on startup\n- Improved connection stability\n- Reduced memory usage\n- Various UI tweaks",
      created_at: Date.now() - 259200000,
      updated_at: Date.now() - 259200000,
    },
    {
      id: 5,
      title: "Getting Started Guide",
      author: "Documentation",
      content:
        "## Welcome to Starlight!\n\nHere's a quick guide to get you started:\n\n1. Download the latest version\n2. Install required dependencies\n3. Join our Discord\n4. Have fun!\n\nFor more detailed instructions, check out our documentation.",
      created_at: Date.now() - 345600000,
      updated_at: Date.now() - 345600000,
    },
    {
      id: 6,
      title: "Security Update",
      author: "SecurityTeam",
      content:
        "## Important Security Patch\n\nWe've released a critical security update. Please update to the latest version as soon as possible.\n\nThis update addresses several security vulnerabilities and improves overall system stability.",
      created_at: Date.now() - 432000000,
      updated_at: Date.now() - 432000000,
    },
  ];

  return [...realData, ...mockData];
}

export function fetchNewsById(id: string | number): Promise<NewsItem> {
  return fetchWithValidation(`${PUBLIC_API_URL}/news/${id}`, NewsItemSchema);
}
