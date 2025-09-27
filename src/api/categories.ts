import { api } from "./client";

// Backend raw shape with i18n
type CategoryRaw = {
  _id: string;
  slug: string;
  nameI18n: { uk: string; en?: string };
  descriptionI18n?: { uk?: string; en?: string } | null;
  imageUrl?: string | null;
  sort?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Category = {
  _id: string;
  slug: string;
  name: string; // UI-friendly, fallback uk->en
  nameI18n?: { uk: string; en?: string };
  description?: string | null; // UI-friendly, prefer uk->en
  descriptionI18n?: { uk?: string; en?: string } | null;
  imageUrl?: string | null;
  sort?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateCategoryDto = {
  slug: string;
  nameUk: string;
  nameEn?: string;
  descUk?: string;
  descEn?: string;
  imageUrl?: string;
  sort?: number;
  isActive?: boolean;
};

export type UpdateCategoryDto = Partial<CreateCategoryDto> & {
  imageUrl?: string | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<CategoryRaw[]>("/admin/categories");
  return data.map((c) => ({
    _id: c._id,
    slug: c.slug,
    name: c.nameI18n?.uk || c.nameI18n?.en || "",
    nameI18n: c.nameI18n,
    description: c.descriptionI18n?.uk || c.descriptionI18n?.en || null,
    descriptionI18n: c.descriptionI18n ?? null,
    imageUrl: c.imageUrl ?? null,
    sort: c.sort ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  }));
}

export async function createCategory(
  payload: CreateCategoryDto
): Promise<Category> {
  const wire = {
    slug: payload.slug,
    nameI18n: {
      uk: payload.nameUk,
      ...(payload.nameEn ? { en: payload.nameEn } : {}),
    },
    ...(payload.descUk || payload.descEn
      ? {
          descriptionI18n: {
            ...(payload.descUk ? { uk: payload.descUk } : {}),
            ...(payload.descEn ? { en: payload.descEn } : {}),
          },
        }
      : {}),
    imageUrl: payload.imageUrl,
    sort: payload.sort,
    isActive: payload.isActive,
  } as const;

  const { data } = await api.post<CategoryRaw>("/admin/categories", wire);
  return {
    _id: data._id,
    slug: data.slug,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    imageUrl: data.imageUrl ?? null,
    sort: data.sort ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function updateCategory(
  id: string,
  payload: UpdateCategoryDto
): Promise<Category | null> {
  const { nameUk, nameEn, descUk, descEn, ...rest } = payload;
  const wire: Record<string, unknown> = {
    ...rest,
    ...(nameUk !== undefined || nameEn !== undefined
      ? {
          nameI18n: {
            ...(nameUk !== undefined ? { uk: nameUk } : {}),
            ...(nameEn !== undefined ? { en: nameEn } : {}),
          },
        }
      : {}),
    ...(descUk !== undefined || descEn !== undefined
      ? {
          descriptionI18n: {
            ...(descUk !== undefined ? { uk: descUk } : {}),
            ...(descEn !== undefined ? { en: descEn } : {}),
          },
        }
      : {}),
  };
  const { data } = await api.patch<CategoryRaw | null>(
    `/admin/categories/${id}`,
    wire
  );
  if (!data) return null;
  return {
    _id: data._id,
    slug: data.slug,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    imageUrl: data.imageUrl ?? null,
    sort: data.sort ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function deleteCategory(id: string): Promise<Category | null> {
  const { data } = await api.delete<CategoryRaw | null>(
    `/admin/categories/${id}`
  );
  if (!data) return null;
  return {
    _id: data._id,
    slug: data.slug,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    imageUrl: data.imageUrl ?? null,
    sort: data.sort ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
