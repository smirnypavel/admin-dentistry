import { api } from "./client";

export type ContactItemType =
  | "phone"
  | "email"
  | "telegram"
  | "viber"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "site"
  | "custom";

export type ContactItem = {
  id: string;
  type: ContactItemType;
  value: string;
  label?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  sort?: number;
  link?: string;
  meta?: Record<string, string | number | boolean>;
};

export type ContactCard = {
  _id: string;
  addressI18n?: { uk?: string; en?: string | null } | null;
  phones: string[];
  email?: string | null;
  // Допускаем строку из legacy и массив из новой схемы
  viber?: string[] | string | null;
  telegram?: string[] | string | null;
  // V2 (frontend-only for now): derived from legacy or provided by backend when upgraded
  items?: ContactItem[];
  sort: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateContactRequest = {
  addressUk?: string;
  addressEn?: string;
  // V2 preferred shape (frontend). Will be projected to legacy fields until backend supports items[]
  items?: ContactItem[];
  phones?: string[];
  email?: string;
  viber?: string[];
  telegram?: string[];
  sort?: number;
  isActive?: boolean;
};

export type UpdateContactRequest = Partial<CreateContactRequest>;

function deriveItemsFromLegacy(
  c: Pick<ContactCard, "phones" | "email" | "viber" | "telegram">
): ContactItem[] {
  const items: ContactItem[] = [];
  (c.phones || []).forEach((p, idx) =>
    items.push({
      id: `phone-${idx}-${p}`,
      type: "phone",
      value: p,
      isActive: true,
      sort: idx,
    })
  );
  if (c.email)
    items.push({
      id: `email-0-${c.email}`,
      type: "email",
      value: c.email,
      isActive: true,
    });
  const viberArr = Array.isArray(c.viber)
    ? c.viber
    : c.viber
      ? [String(c.viber)]
      : [];
  viberArr.forEach((v, idx) =>
    items.push({
      id: `viber-${idx}-${v}`,
      type: "viber",
      value: v,
      isActive: true,
      sort: items.length + idx,
    })
  );
  const telegramArr = Array.isArray(c.telegram)
    ? c.telegram
    : c.telegram
      ? [String(c.telegram)]
      : [];
  telegramArr.forEach((v, idx) =>
    items.push({
      id: `telegram-${idx}-${v}`,
      type: "telegram",
      value: v,
      isActive: true,
      sort: items.length + idx,
    })
  );
  return items;
}

function projectItemsToLegacy(items?: ContactItem[]) {
  const res: {
    phones?: string[];
    email?: string;
    viber?: string[];
    telegram?: string[];
  } = {};
  if (!items || !items.length) return res;
  const phones = items
    .filter((i) => i.type === "phone")
    .map((i) => i.value.trim())
    .filter(Boolean);
  if (phones.length) res.phones = phones;
  const firstOf = (t: ContactItemType) =>
    items.find((i) => i.type === t)?.value?.trim();
  const email = firstOf("email");
  const viber = items
    .filter((i) => i.type === "viber")
    .map((i) => i.value.trim())
    .filter(Boolean);
  const telegram = items
    .filter((i) => i.type === "telegram")
    .map((i) => i.value.trim())
    .filter(Boolean);
  if (email) res.email = email;
  if (viber.length) res.viber = viber;
  if (telegram.length) res.telegram = telegram;
  return res;
}

function toCreateDto(body: CreateContactRequest) {
  const addressUk = (body.addressUk || "").trim();
  const addressEn = (body.addressEn || "").trim();
  const addressI18n =
    addressUk || addressEn
      ? { uk: addressUk || addressEn, en: addressEn || undefined }
      : undefined;
  const legacyFromItems = projectItemsToLegacy(body.items);
  const phonesArr = (body.phones || []).map((p) => p.trim()).filter(Boolean);
  const viberArr = (body.viber || []).map((v) => v.trim()).filter(Boolean);
  const telegramArr = (body.telegram || [])
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    addressI18n,
    phones:
      (phonesArr.length ? phonesArr : legacyFromItems.phones) || undefined,
    email: body.email?.trim() || legacyFromItems.email || undefined,
    viber: (viberArr.length ? viberArr : legacyFromItems.viber) || undefined,
    telegram:
      (telegramArr.length ? telegramArr : legacyFromItems.telegram) ||
      undefined,
    sort:
      typeof body.sort === "number"
        ? Math.max(0, Math.floor(body.sort))
        : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  } as Record<string, unknown>;
}

function toUpdateDto(body: UpdateContactRequest) {
  const dto: Record<string, unknown> = {};
  if ("addressUk" in body || "addressEn" in body) {
    const uk = (body.addressUk || "").trim();
    const en = (body.addressEn || "").trim();
    dto.addressI18n =
      uk || en
        ? { uk: uk || en, en: en || undefined }
        : { uk: "", en: en || undefined };
  }
  const legacyFromItems = projectItemsToLegacy(body.items);
  if (body.phones !== undefined) {
    dto.phones = (body.phones || []).map((p) => p.trim()).filter(Boolean);
  } else if (legacyFromItems.phones) {
    dto.phones = legacyFromItems.phones;
  }
  if ("email" in body || legacyFromItems.email)
    dto.email = body.email?.trim() || legacyFromItems.email || undefined;
  if ("viber" in body) {
    dto.viber = (body.viber || []).map((v) => v.trim()).filter(Boolean);
  } else if (legacyFromItems.viber) {
    dto.viber = legacyFromItems.viber;
  }
  if ("telegram" in body) {
    dto.telegram = (body.telegram || []).map((v) => v.trim()).filter(Boolean);
  } else if (legacyFromItems.telegram) {
    dto.telegram = legacyFromItems.telegram;
  }
  if ("sort" in body && typeof body.sort === "number")
    dto.sort = Math.max(0, Math.floor(body.sort));
  if ("isActive" in body && typeof body.isActive === "boolean")
    dto.isActive = body.isActive;
  return dto;
}

export async function listContacts() {
  const { data } = await api.get<ContactCard[]>("/admin/contacts");
  // enrich with derived items[] for UI flexibility
  return (data || []).map((c) => ({
    ...c,
    items:
      c.items && Array.isArray(c.items) && c.items.length > 0
        ? c.items
        : deriveItemsFromLegacy(c),
  }));
}

export async function createContact(body: CreateContactRequest) {
  const dto = toCreateDto(body);
  const { data } = await api.post<ContactCard>("/admin/contacts", dto);
  const enriched: ContactCard = {
    ...data,
    items:
      data.items && data.items.length > 0
        ? data.items
        : deriveItemsFromLegacy(data),
  };
  return enriched;
}

export async function updateContact(id: string, body: UpdateContactRequest) {
  const dto = toUpdateDto(body);
  const { data } = await api.patch<ContactCard>(`/admin/contacts/${id}`, dto);
  const enriched: ContactCard = {
    ...data,
    items:
      data.items && data.items.length > 0
        ? data.items
        : deriveItemsFromLegacy(data),
  };
  return enriched;
}

export async function deleteContact(id: string) {
  const { data } = await api.delete<ContactCard>(`/admin/contacts/${id}`);
  return data;
}
