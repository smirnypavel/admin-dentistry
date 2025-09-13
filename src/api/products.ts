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

export type Product = {
  _id: string;
  slug: string;
  title: string;
  description?: string | null;
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
  const { data } = await api.get<ListProductsResponse>("/admin/products", {
    params,
  });
  return data;
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await api.get<Product | null>(`/admin/products/${id}`);
  return data;
}

export type CreateProductDto = {
  slug?: string;
  title: string;
  description?: string | null;
  categoryIds?: string[];
  tags?: string[];
  images?: string[];
  attributes?: Array<{ key: string; value: string | number | boolean }>;
  variants: ProductVariant[];
  isActive?: boolean;
};

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const { data } = await api.post<Product>("/admin/products", dto);
  return data;
}

export type UpdateProductDto = Partial<Omit<CreateProductDto, "variants">> & {
  variants?: ProductVariant[];
};

export async function updateProduct(
  id: string,
  dto: UpdateProductDto
): Promise<Product | null> {
  const { data } = await api.patch<Product | null>(
    `/admin/products/${id}`,
    dto
  );
  return data;
}

export async function deleteProduct(id: string): Promise<Product | null> {
  const { data } = await api.delete<Product | null>(`/admin/products/${id}`);
  return data;
}

export async function addVariant(
  productId: string,
  variant: ProductVariant
): Promise<Product> {
  const { data } = await api.post<Product>(
    `/admin/products/${productId}/variants`,
    variant
  );
  return data;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  dto: Partial<ProductVariant>
): Promise<Product> {
  const { data } = await api.patch<Product>(
    `/admin/products/${productId}/variants/${variantId}`,
    dto
  );
  return data;
}

export async function deleteVariant(
  productId: string,
  variantId: string
): Promise<Product> {
  const { data } = await api.delete<Product>(
    `/admin/products/${productId}/variants/${variantId}`
  );
  return data;
}
