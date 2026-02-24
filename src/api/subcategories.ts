import { api } from "./client";

// Backend raw shape with i18n
type SubcategoryRaw = {
  _id: string;
  slug: string;
  nameI18n: { uk: string; en?: string };
  descriptionI18n?: { uk?: string; en?: string } | null;
  imageUrl?: string | null;
  categoryId: string;
  sort?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Subcategory = {
  _id: string;
  slug: string;
  name: string; // UI-friendly, fallback uk->en
  nameI18n?: { uk: string; en?: string };
  description?: string | null;
  descriptionI18n?: { uk?: string; en?: string } | null;
  imageUrl?: string | null;
  categoryId: string;
  sort?: number | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateSubcategoryDto = {
  slug: string;
  nameUk: string;
  nameEn?: string;
  descUk?: string;
  descEn?: string;
  imageUrl?: string;
  categoryId: string;
  sort?: number;
  isActive?: boolean;
};

export type UpdateSubcategoryDto = Partial<CreateSubcategoryDto> & {
  imageUrl?: string | null;
};

function mapRawToUi(c: SubcategoryRaw): Subcategory {
  return {
    _id: c._id,
    slug: c.slug,
    name: c.nameI18n?.uk || c.nameI18n?.en || "",
    nameI18n: c.nameI18n,
    description: c.descriptionI18n?.uk || c.descriptionI18n?.en || null,
    descriptionI18n: c.descriptionI18n ?? null,
    imageUrl: c.imageUrl ?? null,
    categoryId: c.categoryId,
    sort: c.sort ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  };
}

function buildWire(payload: CreateSubcategoryDto | UpdateSubcategoryDto) {
  const { nameUk, nameEn, descUk, descEn, ...rest } = payload as Record<
    string,
    unknown
  >;
  return {
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
}

export async function listSubcategories(): Promise<Subcategory[]> {
  const { data } = await api.get<SubcategoryRaw[]>("/admin/subcategories");
  return data.map(mapRawToUi);
}

export async function createSubcategory(
  payload: CreateSubcategoryDto,
): Promise<Subcategory> {
  const wire = buildWire(payload);
  const { data } = await api.post<SubcategoryRaw>("/admin/subcategories", wire);
  return mapRawToUi(data);
}

export async function updateSubcategory(
  id: string,
  payload: UpdateSubcategoryDto,
): Promise<Subcategory | null> {
  const wire = buildWire(payload);
  const { data } = await api.patch<SubcategoryRaw | null>(
    `/admin/subcategories/${id}`,
    wire,
  );
  if (!data) return null;
  return mapRawToUi(data);
}

export async function deleteSubcategory(
  id: string,
): Promise<Subcategory | null> {
  const { data } = await api.delete<SubcategoryRaw | null>(
    `/admin/subcategories/${id}`,
  );
  if (!data) return null;
  return mapRawToUi(data);
}
