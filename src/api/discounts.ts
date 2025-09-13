import { api } from "./client";

export type TargetGroup = {
  productIds?: string[];
  categoryIds?: string[];
  manufacturerIds?: string[];
  countryIds?: string[];
  tags?: string[];
};

export type Discount = {
  _id: string;
  name: string;
  description?: string | null;
  type: "percent" | "fixed";
  value: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  priority?: number;
  stackable?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  manufacturerIds?: string[];
  countryIds?: string[];
  tags?: string[];
  targetGroups?: TargetGroup[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListDiscountsParams = {
  q?: string;
  isActive?: boolean;
  sort?: string; // e.g. -createdAt,priority
  page?: number;
  limit?: number;
};

export type ListDiscountsResponse = {
  items: Discount[];
  page: number;
  limit: number;
  total: number;
};

export async function listDiscounts(
  params: ListDiscountsParams
): Promise<ListDiscountsResponse> {
  const { data } = await api.get<ListDiscountsResponse>("/admin/discounts", {
    params,
  });
  return data;
}

export async function getDiscount(id: string): Promise<Discount | null> {
  const { data } = await api.get<Discount | null>(`/admin/discounts/${id}`);
  return data;
}

export type CreateDiscountDto = {
  name: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  isActive?: boolean;
  startsAt?: string; // ISO
  endsAt?: string; // ISO
  priority?: number;
  stackable?: boolean;
  productIds?: string[];
  categoryIds?: string[];
  manufacturerIds?: string[];
  countryIds?: string[];
  tags?: string[];
  targetGroups?: TargetGroup[];
};

export async function createDiscount(
  dto: CreateDiscountDto
): Promise<Discount> {
  const { data } = await api.post<Discount>("/admin/discounts", dto);
  return data;
}

export type UpdateDiscountDto = Partial<CreateDiscountDto>;

export async function updateDiscount(
  id: string,
  dto: UpdateDiscountDto
): Promise<Discount | null> {
  const { data } = await api.patch<Discount | null>(
    `/admin/discounts/${id}`,
    dto
  );
  return data;
}

export async function deleteDiscount(id: string): Promise<Discount | null> {
  const { data } = await api.delete<Discount | null>(`/admin/discounts/${id}`);
  return data;
}

export type ManageDiscountTargetsDto = {
  productIds?: string[];
  categoryIds?: string[];
  manufacturerIds?: string[];
  countryIds?: string[];
};

export async function addDiscountTargets(
  id: string,
  dto: ManageDiscountTargetsDto
): Promise<Discount | null> {
  const { data } = await api.patch<Discount | null>(
    `/admin/discounts/${id}/targets`,
    dto
  );
  return data;
}

export async function removeDiscountTargets(
  id: string,
  dto: ManageDiscountTargetsDto
): Promise<Discount | null> {
  const { data } = await api.patch<Discount | null>(
    `/admin/discounts/${id}/targets/remove`,
    dto
  );
  return data;
}
