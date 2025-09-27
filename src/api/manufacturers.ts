import { api } from "./client";

// Backend raw with i18n
type ManufacturerRaw = {
  _id: string;
  nameI18n: { uk: string; en?: string };
  slug: string;
  countryIds: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  descriptionI18n?: { uk?: string; en?: string } | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Manufacturer = {
  _id: string;
  name: string; // UI-friendly uk->en
  nameI18n?: { uk: string; en?: string };
  slug: string;
  countryIds: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string | null;
  description?: string | null; // UI-friendly uk->en
  descriptionI18n?: { uk?: string; en?: string } | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateManufacturerDto = {
  nameUk: string;
  nameEn?: string;
  slug: string;
  countryIds?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  descUk?: string;
  descEn?: string;
  isActive?: boolean;
};

export type UpdateManufacturerDto = Partial<CreateManufacturerDto> & {
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

export async function listManufacturers(): Promise<Manufacturer[]> {
  const { data } = await api.get<ManufacturerRaw[]>("/admin/manufacturers");
  return data.map((m) => ({
    _id: m._id,
    name: m.nameI18n?.uk || m.nameI18n?.en || "",
    nameI18n: m.nameI18n,
    slug: m.slug,
    countryIds: m.countryIds || [],
    logoUrl: m.logoUrl ?? null,
    bannerUrl: m.bannerUrl ?? null,
    website: m.website ?? null,
    description: m.descriptionI18n?.uk || m.descriptionI18n?.en || null,
    descriptionI18n: m.descriptionI18n ?? null,
    isActive: m.isActive,
    createdAt: m.createdAt ?? null,
    updatedAt: m.updatedAt ?? null,
  }));
}

export async function createManufacturer(
  payload: CreateManufacturerDto
): Promise<Manufacturer> {
  const wire = {
    nameI18n: {
      uk: payload.nameUk,
      ...(payload.nameEn ? { en: payload.nameEn } : {}),
    },
    slug: payload.slug,
    countryIds: payload.countryIds || [],
    logoUrl: payload.logoUrl,
    bannerUrl: payload.bannerUrl,
    website: payload.website,
    ...(payload.descUk || payload.descEn
      ? {
          descriptionI18n: {
            ...(payload.descUk ? { uk: payload.descUk } : {}),
            ...(payload.descEn ? { en: payload.descEn } : {}),
          },
        }
      : {}),
    isActive: payload.isActive,
  } as const;
  const { data } = await api.post<ManufacturerRaw>(
    "/admin/manufacturers",
    wire
  );
  return {
    _id: data._id,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    countryIds: data.countryIds || [],
    logoUrl: data.logoUrl ?? null,
    bannerUrl: data.bannerUrl ?? null,
    website: data.website ?? null,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function updateManufacturer(
  id: string,
  payload: UpdateManufacturerDto
): Promise<Manufacturer | null> {
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
  const { data } = await api.patch<ManufacturerRaw | null>(
    `/admin/manufacturers/${id}`,
    wire
  );
  if (!data) return null;
  return {
    _id: data._id,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    countryIds: data.countryIds || [],
    logoUrl: data.logoUrl ?? null,
    bannerUrl: data.bannerUrl ?? null,
    website: data.website ?? null,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function deleteManufacturer(
  id: string
): Promise<Manufacturer | null> {
  const { data } = await api.delete<ManufacturerRaw | null>(
    `/admin/manufacturers/${id}`
  );
  if (!data) return null;
  return {
    _id: data._id,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    countryIds: data.countryIds || [],
    logoUrl: data.logoUrl ?? null,
    bannerUrl: data.bannerUrl ?? null,
    website: data.website ?? null,
    description: data.descriptionI18n?.uk || data.descriptionI18n?.en || null,
    descriptionI18n: data.descriptionI18n ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
