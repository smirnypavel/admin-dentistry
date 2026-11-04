import { api } from "./client";

/** Per-category landing content (hero banner + "image + description" blocks).
 * Stored in the generic page-content key/value store under `cat-content-<slug>`,
 * so no dedicated backend endpoint is needed. The storefront reads the same key. */
export type CategoryContentBlock = { img?: string; text?: string };
export type CategoryPageContent = { hero?: string; blocks?: CategoryContentBlock[] };

const keyFor = (slug: string) => `cat-content-${slug}`;

export async function getCategoryContent(slug: string): Promise<CategoryPageContent> {
  try {
    const { data } = await api.get<CategoryPageContent>(`/admin/pages/${keyFor(slug)}`);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export async function saveCategoryContent(
  slug: string,
  content: CategoryPageContent,
): Promise<void> {
  await api.put(`/admin/pages/${keyFor(slug)}`, content);
}
