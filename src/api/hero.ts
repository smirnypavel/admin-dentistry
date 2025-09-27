import { api } from "./client";

export type I18nText = { uk?: string; en?: string };

export type HeroCTA = {
  labelI18n?: I18nText;
  url?: string | null;
  external?: boolean; // default false
};

export type Hero = {
  _id: string;
  titleI18n?: I18nText | null;
  subtitleI18n?: I18nText | null;
  imageUrl?: string | null;
  imageUrlMobile?: string | null;
  videoUrl?: string | null;
  cta?: HeroCTA | null;
  theme: "light" | "dark"; // default 'light'
  isActive: boolean; // default false
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateHeroRequest = Partial<
  Omit<Hero, "_id" | "createdAt" | "updatedAt">
>;
export type UpdateHeroRequest = Partial<
  Omit<Hero, "_id" | "createdAt" | "updatedAt">
>;

export async function getHeroLatest() {
  const { data } = await api.get<Hero | null>("/admin/hero");
  return data;
}

export async function getHeroById(id: string) {
  const { data } = await api.get<Hero | null>(`/admin/hero/${id}`);
  return data;
}

export async function createHero(body: CreateHeroRequest) {
  const { data } = await api.post<Hero>("/admin/hero", normalizeHeroDto(body));
  return data;
}

export async function updateHero(id: string, body: UpdateHeroRequest) {
  const { data } = await api.patch<Hero>(
    `/admin/hero/${id}`,
    normalizeHeroDto(body)
  );
  return data;
}

export async function deleteHero(id: string) {
  const { data } = await api.delete<Hero | null>(`/admin/hero/${id}`);
  return data;
}

function normalizeHeroDto<T extends CreateHeroRequest | UpdateHeroRequest>(
  body: T
): T {
  const trim = (s?: string | null) => (s ?? "").trim() || undefined;
  const dto: Partial<CreateHeroRequest & UpdateHeroRequest> = {};

  if (body.titleI18n) {
    const uk = trim(body.titleI18n.uk);
    const en = trim(body.titleI18n.en);
    dto.titleI18n = uk || en ? { uk, en } : undefined;
  }
  if (body.subtitleI18n) {
    const uk = trim(body.subtitleI18n.uk);
    const en = trim(body.subtitleI18n.en);
    dto.subtitleI18n = uk || en ? { uk, en } : undefined;
  }
  if (body.cta) {
    const labelUk = trim(body.cta.labelI18n?.uk);
    const labelEn = trim(body.cta.labelI18n?.en);
    dto.cta = {
      labelI18n: labelUk || labelEn ? { uk: labelUk, en: labelEn } : undefined,
      url: trim(body.cta.url) ?? undefined,
      external:
        typeof body.cta.external === "boolean" ? body.cta.external : undefined,
    };
  }
  if ("imageUrl" in body) dto.imageUrl = trim(body.imageUrl);
  if ("imageUrlMobile" in body) dto.imageUrlMobile = trim(body.imageUrlMobile);
  if ("videoUrl" in body) dto.videoUrl = trim(body.videoUrl);
  if ("theme" in body) dto.theme = body.theme;
  if ("isActive" in body) dto.isActive = body.isActive;

  return dto as T;
}
