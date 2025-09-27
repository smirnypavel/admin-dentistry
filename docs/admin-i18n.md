# Admin i18n Guide (uk/en)

This backend stores localized fields per-entity without DB fallbacks. Frontend chooses the language. For now we support two locales:

- uk — required
- en — optional

If a value is missing, it will be absent in the DB (no implicit fallback). Swagger examples and filters have been updated accordingly.

## Entities and fields

- Product
  - titleI18n: { uk: string; en?: string }
  - descriptionI18n?: { uk: string; en?: string }
  - slug: string (generated from uk title if empty) — not localized
- Category
  - nameI18n: { uk: string; en?: string }
  - descriptionI18n?: { uk?: string; en?: string }
- Manufacturer
  - nameI18n: { uk: string; en?: string }
  - descriptionI18n?: { uk?: string; en?: string }
- Country
  - nameI18n: { uk: string; en?: string }

Note: uk is the canonical locale. Keep uk filled everywhere; add en when available.

## Create/Update payloads

### Product (create)

```json
{
  "slug": "universal-composite", // optional — will be generated from titleI18n.uk if empty
  "titleI18n": { "uk": "Композит універсальний", "en": "Universal composite" },
  "descriptionI18n": { "uk": "Опис...", "en": "Description..." },
  "categoryIds": ["<catId>"],
  "tags": ["popular"],
  "variants": [
    {
      "sku": "UC-A2-2G",
      "manufacturerId": "<manufacturerId>",
      "countryId": "<countryId>",
      "options": { "shade": "A2", "size": "2g" },
      "price": 350,
      "unit": "шт",
      "isActive": true
    }
  ],
  "isActive": true
}
```

### Product (update)

Send only fields you want to change. For nested i18n you can PATCH partial values, e.g. to add English later:

```json
{
  "titleI18n": { "en": "Universal composite" },
  "descriptionI18n": { "en": "Description..." }
}
```

### Category/Manufacturer/Country

All follow the same pattern:

```json
{
  "nameI18n": { "uk": "Країна", "en": "Country" },
  "descriptionI18n": { "uk": "Опис", "en": "Description" } // optional
}
```

For Country, only nameI18n is used (description is not required and may be omitted).

## Search and filters (admin)

- q (full-text): uses Mongo text index; it matches i18n fields for products (titleI18n, descriptionI18n). Works best for relevance queries.
- qLike (substring): now searches across i18n fields and helpers:
  - Products: titleI18n.uk, titleI18n.en, descriptionI18n.uk, descriptionI18n.en, slug, variants.sku
  - Categories/Manufacturers/Countries: search endpoints may vary; use `nameI18n.uk` (and `.en` where implemented)

Tip: Combine `q` + `qLike` for precise + fuzzy results; they are ANDed.

## Sorting rules

- Products: sort accepts any field; for localized titles use `titleI18n.uk` (e.g., `sort=-createdAt,titleI18n.uk`).
- Categories: sorted by `sort` ASC then `nameI18n.uk` ASC in public; admin listing can accept explicit sort if provided.
- Manufacturers/Countries: prefer sorting by `nameI18n.uk`.

## Slugs and i18n

- Slugs remain non-localized and are generated from `titleI18n.uk` if empty on create or explicit reset.
- You can supply your own `slug`; it will be normalized and de-duplicated.

## Orders and titles

- Order item snapshot takes the client-provided `title`. If omitted, it falls back to `product.titleI18n.uk` at the time of order creation.

## Recommendations for admins

- Always fill `uk` values first. Add `en` when translation is ready.
- When editing, you can PATCH only the changed locale keys — other locales remain untouched.
- For sorting/searching in lists, prefer the `uk` keys to have consistent admin UI behavior (unless you specifically target English data).

## Known limitations

- No automatic cross-locale fallbacks in DB or API. The frontend must choose which locale to render.
- Slugs are language-agnostic; if you later change uk title, consider whether you want to regenerate or keep the slug for SEO.

---

## Frontend quick reference (админка)

Что поменялось (vs legacy):

- Product: `title` → `titleI18n`, `description` → `descriptionI18n`.
- Category: `name` → `nameI18n`, `description` → `descriptionI18n`.
- Manufacturer: `name` → `nameI18n`, `description` → `descriptionI18n`.
- Country: `name` → `nameI18n`.

Минимальные поля для форм:

- Product create/update:
  - Обязательные: `titleI18n.uk`
  - Опциональные: `titleI18n.en`, `descriptionI18n.uk`, `descriptionI18n.en`
  - Прочее без изменений: `slug` (необязателен), `categoryIds`, `tags`, `variants[*]`, `isActive`

- Category/Manufacturer/Country create/update:
  - Обязательные: `nameI18n.uk`
  - Опциональные: `nameI18n.en`, `descriptionI18n.uk`, `descriptionI18n.en` (для Country описание можно опускать)

Запросы списка (подсказки для полей запроса):

- Products GET /admin/products:
  - Поиск: `q` (full-text), `qLike` (substring по i18n полям + slug + sku)
  - Фильтры: `category`, `manufacturerId[]`, `countryId[]`, `tags[]`, `isActive`, `opt.<key>`
  - Сортировка: `sort=-createdAt,titleI18n.uk` (или любые поля)

- Categories/Manufacturers/Countries GET:
  - Сортировка по умолчанию: по имени `nameI18n.uk` (категории ещё учитывают `sort` asc)
  - Для явной сортировки в админке используйте `nameI18n.uk`

Примеры полных payload’ов:

```json
// Product create
{
  "titleI18n": { "uk": "Композит універсальний", "en": "Universal composite" },
  "descriptionI18n": { "uk": "Опис...", "en": "Description..." },
  "categoryIds": ["<catId>"],
  "tags": ["popular"],
  "variants": [
    {
      "sku": "UC-A2-2G",
      "manufacturerId": "<manufacturerId>",
      "countryId": "<countryId>",
      "options": { "shade": "A2", "size": "2g" },
      "price": 350,
      "unit": "шт",
      "isActive": true
    }
  ],
  "isActive": true
}

// Product update (добавить английские поля позже)
{
  "titleI18n": { "en": "Universal composite" },
  "descriptionI18n": { "en": "Description..." }
}

// Category create
{
  "nameI18n": { "uk": "Терапевтичні матеріали", "en": "Therapeutic materials" },
  "descriptionI18n": { "uk": "Опис категорії", "en": "Category description" }
}

// Manufacturer create
{
  "nameI18n": { "uk": "Виробник A", "en": "Manufacturer A" },
  "descriptionI18n": { "uk": "Опис", "en": "Description" }
}

// Country create
{
  "nameI18n": { "uk": "Україна", "en": "Ukraine" }
}
```

### Поиск/сортировка — шпаргалка

| Сущность      | Поиск (qLike)                                              | Полнотекст (q)              | Рекомендуемая сортировка |
| ------------- | ---------------------------------------------------------- | --------------------------- | ------------------------ |
| Products      | titleI18n.uk/en, descriptionI18n.uk/en, slug, variants.sku | Да (i18n title/description) | -createdAt, titleI18n.uk |
| Categories    | nameI18n.uk/en (если нужно)                                | Опционально                 | sort, nameI18n.uk        |
| Manufacturers | nameI18n.uk/en (если нужно)                                | Опционально                 | nameI18n.uk              |
| Countries     | nameI18n.uk/en (если нужно)                                | Опционально                 | nameI18n.uk              |
