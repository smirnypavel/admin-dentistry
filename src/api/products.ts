import { api } from "./client";

export type ProductVariant = {
  _id?: string;
  sku: string;
  manufacturerId: string;
  countryId?: string | null;
  options?: Record<string, string | number>;
  price: number;
  unit?: string | null;
  images?: string[];
  barcode?: string | null;
  isActive: boolean;
  variantKey?: string | null;
};

// Backend raw shape with i18n fields
type ProductRaw = {
  _id: string;
  slug: string;
  titleI18n: { uk: string; en?: string };
  descriptionI18n?: { uk?: string; en?: string } | null;
  categoryIds: string[];
  tags?: string[];
  images?: string[];
  attributes?: Array<{ key: string; value: string | number | boolean }>;
  variants: ProductVariant[];
  manufacturerIds?: string[];
  countryIds?: string[];
  priceMin?: number;
  priceMax?: number;
  optionsSummary?: Record<string, Array<string | number>>;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// UI-friendly shape with computed title/description for display
export type Product = {
  _id: string;
  slug: string;
  title: string; // prefer uk -> en
  titleI18n?: { uk: string; en?: string };
  description?: string | null; // prefer uk -> en
  descriptionI18n?: { uk?: string; en?: string } | null;
  categoryIds: string[];
  tags?: string[];
  images?: string[];
  attributes?: Array<{ key: string; value: string | number | boolean }>;
  variants: ProductVariant[];
  manufacturerIds?: string[];
  countryIds?: string[];
  priceMin?: number;
  priceMax?: number;
  optionsSummary?: Record<string, Array<string | number>>;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListProductsParams = {
  q?: string;
  category?: string;
  manufacturerId?: string | string[];
  countryId?: string | string[];
  tags?: string | string[];
  isActive?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
  // Variant option filters: opt.<key>=<value>
  // Pass as params using dynamic keys, e.g., { ["opt.size"]: "2g", ["opt.shade"]: ["A2","A3"] }
  [optKey: `opt.${string}`]:
    | string
    | number
    | Array<string | number>
    | undefined;
};

export type ListProductsResponse = {
  items: Product[];
  page: number;
  limit: number;
  total: number;
};

export async function listProducts(
  params: ListProductsParams
): Promise<ListProductsResponse> {
  const { data } = await api.get<{
    items: ProductRaw[];
    page: number;
    limit: number;
    total: number;
  }>("/admin/products", {
    params,
  });
  return {
    ...data,
    items: data.items.map((p) => ({
      _id: p._id,
      slug: p.slug,
      title: p.titleI18n?.uk || p.titleI18n?.en || "",
      titleI18n: p.titleI18n,
      description: p.descriptionI18n?.uk || p.descriptionI18n?.en || null,
      descriptionI18n: p.descriptionI18n ?? null,
      categoryIds: p.categoryIds || [],
      tags: p.tags || [],
      images: p.images || [],
      attributes: p.attributes || [],
      variants: p.variants || [],
      manufacturerIds: p.manufacturerIds || [],
      countryIds: p.countryIds || [],
      priceMin: p.priceMin ?? undefined,
      priceMax: p.priceMax ?? undefined,
      optionsSummary: p.optionsSummary || undefined,
      isActive: p.isActive,
      createdAt: p.createdAt ?? null,
      updatedAt: p.updatedAt ?? null,
    })),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await api.get<ProductRaw | null>(`/admin/products/${id}`);
  if (!data) return null;
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export type CreateProductDto = {
  slug?: string;
  titleUk: string;
  titleEn?: string;
  descUk?: string;
  descEn?: string;
  categoryIds?: string[];
  tags?: string[];
  images?: string[];
  attributes?: Array<{ key: string; value: string | number | boolean }>;
  variants: ProductVariant[];
  isActive?: boolean;
};

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const titleUkTrim = (dto.titleUk || "").trim();
  const titleEnTrim = (dto.titleEn || "").trim();
  const ukTitle = titleUkTrim || titleEnTrim || "";
  const wire = {
    slug: dto.slug ?? "",
    titleI18n: {
      uk: ukTitle,
      ...(titleEnTrim ? { en: titleEnTrim } : {}),
    },
    ...((dto.descUk || "").trim() || (dto.descEn || "").trim()
      ? {
          descriptionI18n: {
            ...((dto.descUk || "").trim()
              ? { uk: (dto.descUk || "").trim() }
              : {}),
            ...((dto.descEn || "").trim()
              ? { en: (dto.descEn || "").trim() }
              : {}),
          },
        }
      : {}),
    categoryIds: dto.categoryIds,
    tags: dto.tags,
    images: dto.images,
    attributes: dto.attributes,
    variants: dto.variants,
    isActive: dto.isActive,
  } as const;
  const { data } = await api.post<ProductRaw>("/admin/products", wire);
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export type UpdateProductDto = Partial<Omit<CreateProductDto, "variants">> & {
  variants?: ProductVariant[];
};

export async function updateProduct(
  id: string,
  dto: UpdateProductDto
): Promise<Product | null> {
  const { titleUk, titleEn, descUk, descEn, variants, ...rest } = dto;
  const { slug, ...restWithoutSlug } = rest as { slug?: string } & Record<
    string,
    unknown
  >;
  const wire: Record<string, unknown> = {
    ...(slug !== undefined ? { slug: slug ?? "" } : {}),
    ...restWithoutSlug,
    ...(titleUk !== undefined || titleEn !== undefined
      ? {
          titleI18n: {
            ...(titleUk !== undefined ? { uk: titleUk } : {}),
            ...(titleEn !== undefined ? { en: titleEn } : {}),
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
    ...(variants !== undefined ? { variants } : {}),
  };
  const { data } = await api.patch<ProductRaw | null>(
    `/admin/products/${id}`,
    wire
  );
  if (!data) return null;
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const { data } = await api.delete<ProductRaw | null>(`/admin/products/${id}`);
  if (!data) return null;
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function addVariant(
  productId: string,
  variant: ProductVariant
): Promise<Product> {
  const { data } = await api.post<ProductRaw>(
    `/admin/products/${productId}/variants`,
    variant
  );
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function updateVariant(
  productId: string,
  variantId: string,
  dto: Partial<ProductVariant>
): Promise<Product> {
  const { data } = await api.patch<ProductRaw>(
    `/admin/products/${productId}/variants/${variantId}`,
    dto
  );
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function deleteVariant(
  productId: string,
  variantId: string
): Promise<Product> {
  const { data } = await api.delete<ProductRaw>(
    `/admin/products/${productId}/variants/${variantId}`
  );
  return {
    _id: data._id,
    slug: data.slug,
    title: data.titleI18n?.uk || data.titleI18n?.en || "",
    titleI18n: data.titleI18n,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    categoryIds: data.categoryIds || [],
    tags: data.tags || [],
    images: data.images || [],
    attributes: data.attributes || [],
    variants: data.variants || [],
    manufacturerIds: data.manufacturerIds || [],
    countryIds: data.countryIds || [],
    priceMin: data.priceMin ?? undefined,
    priceMax: data.priceMax ?? undefined,
    optionsSummary: data.optionsSummary || undefined,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
