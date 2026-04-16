import { api } from "./client";

export type PromoSlideFeature = {
  text: string;
  href?: string;
};

export type PromoSlide = {
  _id: string;
  title: string;
  description?: string | null;
  price?: string | null;
  oldPrice?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  features: PromoSlideFeature[];
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreatePromoSlideRequest = Partial<
  Omit<PromoSlide, "_id" | "createdAt" | "updatedAt">
> & { title: string };

export type UpdatePromoSlideRequest = Partial<
  Omit<PromoSlide, "_id" | "createdAt" | "updatedAt">
>;

export async function listPromoSlides() {
  const { data } = await api.get<PromoSlide[]>("/admin/promo-slides");
  return data;
}

export async function getPromoSlideById(id: string) {
  const { data } = await api.get<PromoSlide | null>(
    `/admin/promo-slides/${id}`,
  );
  return data;
}

export async function createPromoSlide(body: CreatePromoSlideRequest) {
  const { data } = await api.post<PromoSlide>("/admin/promo-slides", body);
  return data;
}

export async function updatePromoSlide(
  id: string,
  body: UpdatePromoSlideRequest,
) {
  const { data } = await api.patch<PromoSlide>(
    `/admin/promo-slides/${id}`,
    body,
  );
  return data;
}

export async function reorderPromoSlides(ids: string[]) {
  const { data } = await api.patch<{ ok: boolean }>(
    "/admin/promo-slides/reorder/bulk",
    { ids },
  );
  return data;
}

export async function deletePromoSlide(id: string) {
  const { data } = await api.delete<PromoSlide | null>(
    `/admin/promo-slides/${id}`,
  );
  return data;
}
