import { api } from "./client";

export type PromoCode = {
  _id: string;
  code: string;
  name: string;
  description?: string | null;
  type: "percent" | "fixed";
  value: number;
  isActive: boolean;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  allowedProductIds?: string[];
  allowedCategoryIds?: string[];
  allowedSubcategoryIds?: string[];
  excludedProductIds?: string[];
  excludedCategoryIds?: string[];
  excludedSubcategoryIds?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListPromoCodesParams = {
  q?: string;
  isActive?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};

export type ListPromoCodesResponse = {
  items: PromoCode[];
  page: number;
  limit: number;
  total: number;
};

export type CreatePromoCodeDto = {
  code: string;
  name: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  isActive?: boolean;
  usageLimit?: number | null;
  startsAt?: string;
  endsAt?: string;
  allowedProductIds?: string[];
  allowedCategoryIds?: string[];
  allowedSubcategoryIds?: string[];
  excludedProductIds?: string[];
  excludedCategoryIds?: string[];
  excludedSubcategoryIds?: string[];
};

export type UpdatePromoCodeDto = Partial<CreatePromoCodeDto>;

export type PromoCodeStats = {
  promoCode: PromoCode;
  usageCount: number;
  usageLimit: number | null;
  orders: Array<{
    _id: string;
    phone: string;
    total: number;
    promoCodeDiscount: number;
    createdAt: string;
    status: string;
  }>;
  totalDiscount: number;
};

export async function listPromoCodes(
  params: ListPromoCodesParams,
): Promise<ListPromoCodesResponse> {
  const { data } = await api.get<ListPromoCodesResponse>("/admin/promo-codes", {
    params,
  });
  return data;
}

export async function getPromoCode(id: string): Promise<PromoCode | null> {
  const { data } = await api.get<PromoCode | null>(`/admin/promo-codes/${id}`);
  return data;
}

export async function getPromoCodeStats(
  id: string,
): Promise<PromoCodeStats | null> {
  const { data } = await api.get<PromoCodeStats | null>(
    `/admin/promo-codes/${id}/stats`,
  );
  return data;
}

export async function createPromoCode(
  dto: CreatePromoCodeDto,
): Promise<PromoCode> {
  const { data } = await api.post<PromoCode>("/admin/promo-codes", dto);
  return data;
}

export async function updatePromoCode(
  id: string,
  dto: UpdatePromoCodeDto,
): Promise<PromoCode | null> {
  const { data } = await api.patch<PromoCode | null>(
    `/admin/promo-codes/${id}`,
    dto,
  );
  return data;
}

export async function deletePromoCode(id: string): Promise<PromoCode | null> {
  const { data } = await api.delete<PromoCode | null>(
    `/admin/promo-codes/${id}`,
  );
  return data;
}
