import { api } from "./client";

// Backend shape with i18n
type CountryRaw = {
  _id: string;
  code: string;
  nameI18n: { uk: string; en?: string };
  slug: string;
  flagUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Country = {
  _id: string;
  code: string;
  // Computed display name for UI (prefer uk -> en)
  name: string;
  // Optional access to full i18n payload when needed later (not used yet by UI)
  nameI18n?: { uk: string; en?: string };
  slug: string;
  flagUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// Keep UI-friendly DTO (legacy) and convert to i18n on the wire
export type CreateCountryDto = {
  code: string;
  nameUk: string;
  nameEn?: string;
  slug: string;
  flagUrl?: string;
  isActive?: boolean;
};

export type UpdateCountryDto = Partial<CreateCountryDto> & {
  flagUrl?: string | null;
};

export async function listCountries(): Promise<Country[]> {
  const { data } = await api.get<CountryRaw[]>("/admin/countries");
  return data.map((c) => ({
    _id: c._id,
    code: c.code,
    name: c.nameI18n?.uk || c.nameI18n?.en || "",
    nameI18n: c.nameI18n,
    slug: c.slug,
    flagUrl: c.flagUrl ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt ?? null,
    updatedAt: c.updatedAt ?? null,
  }));
}

export async function createCountry(
  payload: CreateCountryDto
): Promise<Country> {
  const wire = {
    code: payload.code,
    nameI18n: { uk: payload.nameUk, ...(payload.nameEn ? { en: payload.nameEn } : {}) },
    slug: payload.slug,
    flagUrl: payload.flagUrl,
    isActive: payload.isActive,
  } as const;
  const { data } = await api.post<CountryRaw>("/admin/countries", wire);
  return {
    _id: data._id,
    code: data.code,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    flagUrl: data.flagUrl ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function updateCountry(
  id: string,
  payload: UpdateCountryDto
): Promise<Country | null> {
  // Build wire payload and translate i18n fields if present
  const { nameUk, nameEn, ...rest } = payload as {
    nameUk?: string;
    nameEn?: string;
  } & Omit<UpdateCountryDto, "nameUk" | "nameEn">;
  const wire: Record<string, unknown> = {
    ...rest,
    ...((nameUk !== undefined || nameEn !== undefined)
      ? {
          nameI18n: {
            ...(nameUk !== undefined ? { uk: nameUk } : {}),
            ...(nameEn !== undefined ? { en: nameEn } : {}),
          },
        }
      : {}),
  };
  const { data } = await api.patch<CountryRaw | null>(
    `/admin/countries/${id}`,
    wire
  );
  if (!data) return null;
  return {
    _id: data._id,
    code: data.code,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    flagUrl: data.flagUrl ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function deleteCountry(id: string): Promise<Country | null> {
  const { data } = await api.delete<CountryRaw | null>(
    `/admin/countries/${id}`
  );
  if (!data) return null;
  return {
    _id: data._id,
    code: data.code,
    name: data.nameI18n?.uk || data.nameI18n?.en || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    flagUrl: data.flagUrl ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
