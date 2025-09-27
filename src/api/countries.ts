import { api } from "./client";

// Backend shape: can be i18n or plain name depending on backend version
type CountryRaw = {
  _id: string;
  code: string;
  nameI18n?: { uk: string; en?: string };
  name?: string;
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
    name: c.nameI18n?.uk || c.nameI18n?.en || c.name || "",
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
  const code = (payload.code || "").trim();
  const uk = (payload.nameUk || "").trim();
  const en = (payload.nameEn || "").trim();
  const slug = (payload.slug || "").trim();
  const wire: Record<string, unknown> = {
    code,
    nameI18n: {
      uk,
      ...(en ? { en } : {}),
    },
    slug,
    ...(payload.flagUrl ? { flagUrl: payload.flagUrl } : {}),
    isActive: payload.isActive ?? true,
  };
  const { data } = await api.post<CountryRaw>("/admin/countries", wire);
  return {
    _id: data._id,
    code: data.code,
    name: data.nameI18n?.uk || data.nameI18n?.en || data.name || "",
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
  const wire: Record<string, unknown> = {};
  // Pass only defined fields
  if (rest.code !== undefined) wire.code = (rest.code as string).trim();
  if (rest.slug !== undefined) wire.slug = (rest.slug as string).trim();
  if (rest.flagUrl !== undefined) wire.flagUrl = rest.flagUrl;
  if (rest.isActive !== undefined) wire.isActive = rest.isActive;
  // Map names to nameI18n if provided
  if (nameUk !== undefined || nameEn !== undefined) {
    const i18n: Record<string, string> = {};
    if (nameUk !== undefined) i18n.uk = (nameUk || "").trim();
    if (nameEn !== undefined) {
      const enTrim = (nameEn || "").trim();
      if (enTrim) i18n.en = enTrim;
    }
    wire.nameI18n = i18n;
  }
  const { data } = await api.patch<CountryRaw | null>(
    `/admin/countries/${id}`,
    wire
  );
  if (!data) return null;
  return {
    _id: data._id,
    code: data.code,
    name: data.nameI18n?.uk || data.nameI18n?.en || data.name || "",
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
    name: data.nameI18n?.uk || data.nameI18n?.en || data.name || "",
    nameI18n: data.nameI18n,
    slug: data.slug,
    flagUrl: data.flagUrl ?? null,
    isActive: data.isActive,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
