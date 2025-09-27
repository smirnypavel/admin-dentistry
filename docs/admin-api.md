# Admin API Guide

[i18n for Admin (uk/en) — how to create, update, search, and sort localized fields](./admin-i18n.md)

Secure base: All admin endpoints are prefixed with `/admin` and require authorization.

Auth options (either is accepted):

- Legacy: Header `x-api-key: <ADMIN_API_KEY>`
- New: Header `Authorization: Bearer <JWT>` (получить токен через `/admin/auth/login`)

- Base URL (local): `http://localhost:3000`
- Default Content-Type: `application/json` (кроме загрузок изображений)

Во всех примерах ниже показан заголовок `x-api-key` для краткости; вместо него можно использовать `Authorization: Bearer <JWT>` (получите токен через `/admin/auth/login`).

Common responses

- 200 OK — successful read/update/delete
- 201 Created — successful creation
- 400 Bad Request — validation error или конфликт (например, дублирующийся SKU варианта)
- 401 Unauthorized — отсутствует авторизация (`x-api-key` или `Authorization: Bearer ...`)
- 403 Forbidden — неверный `x-api-key`, невалидный/просроченный Bearer токен, или ключ администратора не сконфигурирован
- 404 Not Found — ресурс не найден (актуально для эндпоинтов вариантов товара и PATCH товара)

### Формат ошибок

Все ошибки возвращаются в едином формате:

```
{
  "statusCode": 403,
  "message": "Invalid admin API key",
  "error": "Forbidden",
  "path": "/admin/products",
  "requestId": "abc123",
  "timestamp": "2025-09-13T12:00:00.000Z"
}
```

При необходимости может быть поле `details`. Вы можете передавать заголовок `X-Request-Id` для трассировки.

См. также: Admin Dashboard — подробности и примеры в файле `docs/admin-dashboard.md`.

Auth errors (примеры)

```
// 401 Missing key (x-api-key)
{
  "statusCode": 401,
  "message": "Missing x-api-key",
  "error": "Unauthorized"
}

// 403 Admin key not configured (x-api-key)
{
  "statusCode": 403,
  "message": "Admin API key is not configured",
  "error": "Forbidden"
}

// 403 Invalid key (x-api-key)
{
  "statusCode": 403,
  "message": "Invalid admin API key",
  "error": "Forbidden"
}

// 401 Missing Bearer token
{
  "statusCode": 401,
  "message": "Missing Authorization: Bearer token",
  "error": "Unauthorized"
}

// 403 Invalid/expired Bearer token
{
  "statusCode": 403,
  "message": "Invalid or expired token",
  "error": "Forbidden"
}
```

---

## Auth (администраторы)

Base: `/admin/auth`

- POST `/admin/auth/login` — логин и получение JWT
  - Body: `{ "username": "admin", "password": "secret" }`
  - Response: `{ "accessToken": "<JWT>" }`
  - Далее используйте `Authorization: Bearer <JWT>` для всех `/admin/*` запросов (или `x-api-key`).

Примеры:

```bash

```

```

Example response:

```

[
{
"\_id": "665f1a2b3c4d5e6f7a8b9c0d",
"title": "Композит универсальный",
"slug": "kompozit-universalnyj",
"priceMin": 350,
"priceMax": 480,
"matchedSkus": ["UC-1", "UC-2"]
}
]

````

Notes:

- If both `q` and `qLike` are provided, they are combined with AND.
- `matchedSkus` lists up to 5 variant SKUs matching `qLike`; if `qLike` is missing, a few SKUs are included by default.
- Minimal fields only for performance.

### List products

GET `/admin/products`

Query params:

  - `q` string (optional): full-text search via MongoDB text index (matches i18n title/description fields).
  - `qLike` string (optional): case-insensitive substring search across `titleI18n.uk/en`, `slug`, `descriptionI18n.uk/en`, and `variants.sku`. Safe-escaped as a literal regex. Great for live search/autocomplete.
- `category` string (ObjectId): filter by category contained in `categoryIds`.
- `manufacturerId` string | string[]: one or multiple manufacturer IDs contained in product `manufacturerIds`.
- `countryId` string | string[]: one or multiple country IDs contained in product `countryIds`.
- `tags` string | string[]: include products having any of specified tags.
- `isActive` boolean: filter by active state.
- `opt.<key>=<value>`: variant options filter. Repeat params to OR values, e.g. `opt.size=2g&opt.size=4g&opt.shade=A2`.
- `sort` string: comma-separated fields, prefix with `-` for desc. Examples: `-createdAt`, `priceMin,-titleI18n.uk`.
- `page` number (default 1)
- `limit` number (default 20, max 50)

Behavior notes:

- You can combine `q` and `qLike`; both will apply (AND). Use `q` for relevancy via full-text, and `qLike` for instant partial matches while typing.
- `qLike` uses a case-insensitive regex OR across several fields; on very large datasets it can be slower than `q` because it might not use indexes fully.
- Variant options live inside `variants[*].options` and are matched within any variant (`$elemMatch`). If multiple `opt.*` keys are provided, all must match within the same variant; multiple values for the same key act as OR.

Examples:

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?qLike=comp&page=1&limit=20"

# Combine full-text + substring + filters
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?q=композит&qLike=UC-&manufacturerId=665f00000000000000001001&sort=-createdAt"
````

Product shape (simplified, i18n)

```
{
  _id: string,
  slug: string,
  titleI18n: { uk: string; en?: string },
  descriptionI18n?: { uk?: string; en?: string },
  categoryIds: string[],
  tags?: string[],
  images?: string[],
  attributes?: Array<{ key: string; value: string|number|boolean }>,
  variants: Array<ProductVariant>,
  manufacturerIds: string[],
  countryIds: string[],
  priceMin: number,
  priceMax: number,
  optionsSummary?: Record<string, Array<string|number>>,
  isActive: boolean,
  createdAt: string,
  updatedAt: string
}
```

Variant shape

```
{
  _id: string,
  sku: string,
  manufacturerId: string,
  countryId?: string,
  options: Record<string, string|number>,
  price: number,
  unit?: string,

```

{
"slug": "universal-composite", // если пустой — будет сгенерирован из titleI18n.uk
"titleI18n": { "uk": "Композит універсальний", "en": "Universal composite" },
"descriptionI18n": { "uk": "Опис", "en": "Description" },
"categoryIds": ["<catId>"],
"tags": ["popular"],
"images": ["https://.../1.jpg"],
"attributes": [{"key": "purpose", "value": "restoration"}],
"variants": [
{
"sku": "UC-A2-2G",
"manufacturerId": "<manufacturerId>",
"countryId": "<countryId>",
"options": { "shade": "A2", "size": "2g" },
"price": 350,
"unit": "шт",
"images": [],
"barcode": "482...",
"isActive": true
}
],
"isActive": true
}
}
],
"manufacturerIds": [],
"countryIds": [],
"priceMin": 350,
"priceMax": 480,
"optionsSummary": {"shade":["A2"]},
"isActive": true,
"createdAt": "2025-09-10T12:00:00.000Z",
"updatedAt": "2025-09-10T12:00:00.000Z"
}
],
"page": 1,
"limit": 20,
"total": 1
}

````

Example:

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?q=comp&sort=-createdAt&page=1&limit=20"
````

Examples with filters:

```bash
# By category
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?category=665f0000000000000000c001&sort=-createdAt"

# By multiple manufacturers
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?manufacturerId=665f00000000000000001001&manufacturerId=665f00000000000000001002"

# By countries and tags, only active
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?countryId=665f00000000000000002001&countryId=665f00000000000000002002&tags=sale&tags=popular&isActive=true"

# By variant options (opt.<key>=<value>)
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/products?opt.size=2g&opt.shade=A2"
```

Note:

- Variant options live inside `variants[*].options` and are matched within any variant (`$elemMatch`). If multiple `opt.*` keys are provided, all must match within the same variant; multiple values for the same key act as OR.

### Get product

GET `/admin/products/:id`

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/admin/products/665f1a2b3c4d5e6f7a8b9c0d
```

Responses:

- 200 OK — документ продукта или `null`, если не найден

```
{
  "_id": "665f1a2b3c4d5e6f7a8b9c0d",
  "slug": "universal-composite",
  "titleI18n": { "uk": "Композит універсальний", "en": "Universal composite" },
  "descriptionI18n": { "uk": "Опис...", "en": "Description..." },
  "categoryIds": [],
  "tags": ["popular"],
  "images": [],
  "attributes": [{"key":"purpose","value":"restoration"}],
  "variants": [...],
  "manufacturerIds": [],
  "countryIds": [],
  "priceMin": 350,
  "priceMax": 480,
  "optionsSummary": {"shade":["A2"]},
  "isActive": true,
  "createdAt": "2025-09-10T12:00:00.000Z",
  "updatedAt": "2025-09-10T12:00:00.000Z"
}
```

### Create product

POST `/admin/products`

Body:

```
{
  "slug": "universal-composite",           // если пустой — будет сгенерирован из titleI18n.uk
  "titleI18n": { "uk": "Композит універсальний", "en": "Universal composite" },
  "descriptionI18n": { "uk": "Опис", "en": "Description" },
  "categoryIds": ["<catId>"],
  "tags": ["popular"],
  "images": ["https://.../1.jpg"],
  "attributes": [{ "key": "purpose", "value": "restoration" }],
  "variants": [
    {
      "sku": "UC-A2-2G",
      "manufacturerId": "<manufacturerId>",
      "countryId": "<countryId>",
      "options": { "shade": "A2", "size": "2g" },
      "price": 350,
      "unit": "шт",
      "images": [],
      "barcode": "482...",
      "isActive": true
    }
  ],
  "isActive": true
}
```

Notes:

- `slug` нормализуется и делается уникальным; если пустой — генерируется из `titleI18n.uk`.
- `variants[*].options` приводится к `string|number`.

Responses:

- 201 Created — созданный продукт

```bash
curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "slug":"",
    "titleI18n":{"uk":"Композит","en":"Composite"},
    "variants":[{"sku":"UC-A2-2G","manufacturerId":"<mid>","price":350}]
  }' \
  http://localhost:3000/admin/products
```

### Update product

PATCH `/admin/products/:id`

Body (любые поля опциональны):

```
{
  "slug": "new-slug",   // будет нормализован и станет уникальным; если пустой — regen из titleI18n.uk
  "titleI18n": { "uk": "Нова назва", "en": "New title" },
  "descriptionI18n": { "uk": "Опис...", "en": "Description..." },
  "categoryIds": ["<catId>"],
  "tags": ["sale"],
  "images": ["https://.../2.jpg"],
  "attributes": [{"key": "purpose", "value": "restoration"}],
  "variants": [ /* полная замена массива */ ],
  "isActive": true
}
```

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"titleI18n":{"uk":"Композит PRO"},"slug":""}' \
  http://localhost:3000/admin/products/<productId>
```

### PATCH: добавить английский перевод товара

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"titleI18n":{"en":"Universal composite"},"descriptionI18n":{"en":"Description..."}}' \
  http://localhost:3000/admin/products/<productId>
```

Responses:

- 200 OK — обновлённый продукт
- 404 Not Found — если продукт не найден

```
{ /* Product */ }
```

### Delete product

DELETE `/admin/products/:id`

```bash
curl -X DELETE -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/admin/products/<productId>
```

Responses:

- 200 OK — удалённый документ или `null`, если не найден

```
{ /* Product | null */ }
```

### Add variant

POST `/admin/products/:id/variants`

Body:

```
{
  "sku": "UC-A3-2G",
  "manufacturerId": "<manufacturerId>",
  "countryId": "<countryId>",
  "options": { "shade": "A3", "size": "2g" },
  "price": 360,
  "unit": "шт",
  "images": [],
  "barcode": "482...",
  "isActive": true
}
```

Errors:

- 404 — product not found
- 400 — variant with this SKU already exists

Responses:

- 200 OK — обновлённый продукт с пересчитанными агрегатами

```
{ /* Product */ }
```

```bash
curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"sku":"UC-A3-2G","manufacturerId":"<mid>","price":360}' \
  http://localhost:3000/admin/products/<productId>/variants
```

### Update variant

PATCH `/admin/products/:id/variants/:variantId`

Body (любые поля):

```
{ "price": 380, "options": {"size":"3g"}, "isActive": true }
```

Errors:

- 404 — product/variant not found
- 400 — variant with this SKU already exists (если меняется sku)

Responses:

- 200 OK — обновлённый продукт с пересчитанными агрегатами

```
{ /* Product */ }
```

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"price":380}' \
  http://localhost:3000/admin/products/<productId>/variants/<variantId>
```

### Delete variant

DELETE `/admin/products/:id/variants/:variantId`

Errors:

- 404 — product/variant not found

Responses:

- 200 OK — обновлённый продукт

```
{ /* Product */ }
```

### Bulk update variants

PATCH `/admin/products/bulk/variants`

- Purpose: Массовое изменение параметров вариантов (например, цена, активность, единица измерения) для списка товаров.
- Security: `x-api-key` или `Authorization: Bearer <JWT>`
- Body:

```
{
  "targets": [
    { "productId": "665f...001", "variantId": "665f...a001" },
    { "productId": "665f...001", "sku": "UC-A2-2G" },
    { "productId": "665f...002", "sku": "GP-4G" }
  ],
  "patch": {
    "price": 399,
    "isActive": true,
    "unit": "шт"
  }
}
```

Response `200 OK`:

```
{
  "updated": 3,
  "results": [
    { "productId": "665f...001", "variantId": "665f...a001", "sku": "UC-A2-2G", "status": "ok" },
    { "productId": "665f...001", "variantId": "665f...a002", "sku": "UC-A3-4G", "status": "ok" },
    { "productId": "665f...002", "variantId": "665f...b001", "sku": "GP-4G", "status": "ok" }
  ]
}
```

Notes:

- Для каждого затронутого товара пересчитываются агрегаты (цены, свод опций и пр.).
- Если указаны и `variantId`, и `sku`, приоритет у `variantId`.
- Если `patch` пустой — ответ будет `updated: 0` без модификаций.

```bash
curl -X DELETE -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/admin/products/<productId>/variants/<variantId>
```

### Bulk toggle products active

PATCH `/admin/products/bulk/active`

- Purpose: Массово включить/выключить товары (поле `isActive`).
- Security: `x-api-key` или `Authorization: Bearer <JWT>`
- Body:

```
{
  "productIds": ["665f...001", "665f...002", "665f...003"],
  "isActive": false
}
```

Response `200 OK`:

```
{ "matched": 3, "modified": 3 }
```

Example:

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"productIds":["665f0000000000000000p001","665f0000000000000000p002"],"isActive":true}' \
  http://localhost:3000/admin/products/bulk/active
```

### Bulk add/remove product tags

PATCH `/admin/products/bulk/tags/add` и `/admin/products/bulk/tags/remove`

- Purpose: Массово добавить или удалить теги для набора товаров.
- Body:

```
{
  "productIds": ["665f...001", "665f...002"],
  "tags": ["sale", "popular"]
}
```

Response `200 OK` (обе операции):

```
{ "matched": 2, "modified": 2 }
```

Examples:

```bash
# Add tags
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"productIds":["665f...001","665f...002"],"tags":["sale","popular"]}' \
  http://localhost:3000/admin/products/bulk/tags/add

# Remove tags
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"productIds":["665f...001","665f...002"],"tags":["popular"]}' \
  http://localhost:3000/admin/products/bulk/tags/remove
```

### Bulk add/remove product categories

PATCH `/admin/products/bulk/categories/add` и `/admin/products/bulk/categories/remove`

- Purpose: Массово привязать/отвязать категории (`categoryIds`) у набора товаров.
- Body:

```
{
  "productIds": ["665f...001", "665f...002"],
  "categoryIds": ["665f0000000000000000c001", "665f0000000000000000c002"]
}
```

Response `200 OK` (обе операции):

```
{ "matched": 2, "modified": 2 }
```

Examples:

```bash
# Add categories
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"productIds":["665f...001","665f...002"],"categoryIds":["665f0000000000000000c001","665f0000000000000000c002"]}' \
  http://localhost:3000/admin/products/bulk/categories/add

# Remove categories
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"productIds":["665f...001","665f...002"],"categoryIds":["665f0000000000000000c001"]}' \
  http://localhost:3000/admin/products/bulk/categories/remove
```

### Bulk adjust variant prices

PATCH `/admin/products/bulk/variants/adjust-price`

- Purpose: Массово изменить цены вариантов по целям (по `productId` + `variantId` или `sku`).
- Security: `x-api-key` или `Authorization: Bearer <JWT>`
- Body (укажите ровно одно или оба поля `percent`/`delta`):

```
{
  "targets": [
    { "productId": "665f...001", "variantId": "665f...a001" },
    { "productId": "665f...001", "sku": "UC-A2-2G" },
    { "productId": "665f...002", "sku": "GP-4G" }
  ],
  "patch": {
    "percent": 5,   // +5%
    "delta": -10    // затем -10
  }
}
```

Response `200 OK`:

```
{
  "updated": 3,
  "results": [
    {
      "productId": "665f...001",
      "variantId": "665f...a001",
      "sku": "UC-A2-2G",
      "status": "ok",
      "oldPrice": 350,
      "newPrice": 358
    },
    { "productId": "665f...001", "variantId": "665f...a002", "sku": "UC-A3-4G", "status": "ok", "oldPrice": 420, "newPrice": 431 },
    { "productId": "665f...002", "variantId": "665f...b001", "sku": "GP-4G", "status": "ok", "oldPrice": 500, "newPrice": 515 }
  ]
}
```

Notes:

- Итоговая цена не может быть отрицательной; значения округляются до целого.
- Если цена не меняется (после применения percent/delta), такой элемент помечается `status: "skipped"`.
- Для каждого затронутого товара пересчитываются агрегаты.

---

### Clone product

POST `/admin/products/:id/clone`

- Purpose: Быстро создать копию товара для ручного наполнения.
- Body (optional): `{ "skuSuffix": "-copy", "titlePrefix": "Копия" }`
- Response: склонированный товар с уникальным `slug` и пересчитанными агрегатами.

Example:

```bash
curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"skuSuffix":"-copy","titlePrefix":"Копия"}' \
  http://localhost:3000/admin/products/<productId>/clone
```

### Export products (JSON)

GET `/admin/products/export`

- Purpose: Экспортить текущий каталог в JSON (read-only, поможет согласовать будущий импорт).
- Response: массив товаров (lean JSON).

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/admin/products/export > products.json
```

## Orders

Base: `/admin/orders`

### List orders

GET `/admin/orders`

Query params:

- `status?: new|processing|done|cancelled`
- `phone?: string` — нормализованный телефон (E.164)
- `clientId?: string`
- `createdFrom?: ISO string` — inclusive lower bound
- `createdTo?: ISO string` — inclusive upper bound
- `sort?: string` — e.g. `-createdAt`
- `page?: number` — default 1
- `limit?: number` — default 20 (max 100)

Responses:

- 200 OK

```
{
  "items": [
    {
      "_id": "666600000000000000000001",
      "phone": "+380971112233",
      "clientId": "abc-123",
      "items": [
        {
          "productId": "665f1a2b3c4d5e6f7a8b9c0d",
          "sku": "UC-1",
          "quantity": 2,
          "price": 315,
          "priceOriginal": 350,
          "title": "Композит универсальный",
          "options": {"shade":"A2"},
          "manufacturerId": "665f00000000000000001001",
          "countryId": "665f00000000000000002001",
          "unit": "шт",
          "discountsApplied": [
            {
              "discountId": "6677000000000000000000d1",
              "name": "Осенняя распродажа",
              "type": "percent",
              "value": 10,
              "priceBefore": 350,
              "priceAfter": 315
            }
          ]
        }
      ],
      "itemsTotal": 630,
      "deliveryFee": 0,
      "total": 630,
      "status": "new",
      "createdAt": "2025-09-10T12:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:3000/admin/orders?status=new&sort=-createdAt&page=1&limit=20"
```

### Get order

GET `/admin/orders/:id`

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  http://localhost:3000/admin/orders/<orderId>
```

Responses:

- 200 OK — документ заказа или `null`, если не найден

```
{ /* Order | null */ }
```

### Update order status

PATCH `/admin/orders/:id/status`

Body:

```
{ "status": "processing" } // one of: new|processing|done|cancelled
```

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"processing"}' \
  http://localhost:3000/admin/orders/<orderId>/status
```

Responses:

- 200 OK — обновлённый заказ или `null`, если не найден

```
{ /* Order | null */ }
```

---

## Countries

Base: `/admin/countries`

- GET `/admin/countries` — список
  - 200 OK — `Country[]`
  - Пример ответа:
  ```
  [
    {
      "_id": "6666000000000000000000a1",
      "code": "UA",
      "nameI18n": { "uk": "Україна", "en": "Ukraine" },
      "slug": "ukraine",
      "flagUrl": null,
      "isActive": true,
      "createdAt": "2025-09-10T12:00:00.000Z",
      "updatedAt": "2025-09-10T12:00:00.000Z"
    }
  ]
  ```
- GET `/admin/countries/:id` — получить по id
  - 200 OK — `Country | null`
  - Пример ответа:
  ```
  {
    "_id": "6666000000000000000000a1",
    "code": "UA",
    "nameI18n": { "uk": "Україна", "en": "Ukraine" },
    "slug": "ukraine",
    "flagUrl": null,
    "isActive": true,
    "createdAt": "2025-09-10T12:00:00.000Z",
    "updatedAt": "2025-09-10T12:00:00.000Z"
  }
  ```
- POST `/admin/countries` — создать
  - Body: `{ code: string; nameI18n: { uk: string; en?: string }; slug: string; flagUrl?: string; isActive?: boolean }`
  - 201 Created — созданный `Country`
- PATCH `/admin/countries/:id` — обновить
  - Body: частичное обновление тех же полей
  - 200 OK — обновлённый `Country` или `null`
- DELETE `/admin/countries/:id` — удалить
  - 200 OK — удалённый `Country` или `null`

Примеры:

```bash
curl -H "x-api-key: $ADMIN_API_KEY" http://localhost:3000/admin/countries

curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"code":"DE","nameI18n":{"uk":"Німеччина","en":"Germany"},"slug":"germany"}' \
  http://localhost:3000/admin/countries
```

### PATCH: добавить английский перевод страны

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"nameI18n":{"en":"Germany"}}' \
  http://localhost:3000/admin/countries/<countryId>
```

---

## Manufacturers

Base: `/admin/manufacturers`

- GET `/admin/manufacturers` — список
  - 200 OK — `Manufacturer[]`
  - Пример ответа:
  ```
  [
    {
      "_id": "6666000000000000000000b1",
      "slug": "3m",
      "nameI18n": { "uk": "3M", "en": "3M" },
      "descriptionI18n": { "uk": "Опис виробника", "en": "Manufacturer description" },
      "countryIds": [],
      "logoUrl": null,
      "bannerUrl": null,
      "website": null,
      "isActive": true,
      "createdAt": "2025-09-10T12:00:00.000Z",
      "updatedAt": "2025-09-10T12:00:00.000Z"
    }
  ]
  ```
- GET `/admin/manufacturers/:id` — получить по id
  - 200 OK — `Manufacturer | null`
  - Пример ответа:
  ```
  {
    "_id": "6666000000000000000000b1",
    "slug": "3m",
    "nameI18n": { "uk": "3M", "en": "3M" },
    "descriptionI18n": { "uk": "Опис виробника", "en": "Manufacturer description" },
    "countryIds": [],
    "logoUrl": null,
    "bannerUrl": null,
    "website": null,
    "isActive": true,
    "createdAt": "2025-09-10T12:00:00.000Z",
    "updatedAt": "2025-09-10T12:00:00.000Z"
  }
  ```
- POST `/admin/manufacturers` — создать
  - Body: `{ nameI18n: { uk: string; en?: string }; slug: string; countryIds?: string[]; logoUrl?: string; bannerUrl?: string; website?: string; descriptionI18n?: { uk?: string; en?: string }; isActive?: boolean }`
  - 201 Created — созданный `Manufacturer`
- PATCH `/admin/manufacturers/:id` — обновить (можно менять `countryIds`)
  - 200 OK — обновлённый `Manufacturer` или `null`
- DELETE `/admin/manufacturers/:id` — удалить
  - 200 OK — удалённый `Manufacturer` или `null`

```bash
curl -H "x-api-key: $ADMIN_API_KEY" http://localhost:3000/admin/manufacturers

curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"nameI18n":{"uk":"3M","en":"3M"},"slug":"3m","countryIds":[]}' \
  http://localhost:3000/admin/manufacturers
```

### PATCH: добавить английский перевод производителя

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"nameI18n":{"en":"3M"},"descriptionI18n":{"en":"Manufacturer description"}}' \
  http://localhost:3000/admin/manufacturers/<manufacturerId>
```

---

## Categories

Base: `/admin/categories`

- GET `/admin/categories` — список (сортировка по `sort`, затем `nameI18n.uk`)
  - 200 OK — `Category[]`
  - Пример ответа:
  ```
  [
    {
      "_id": "6666000000000000000000c1",
      "slug": "composites",
      "nameI18n": { "uk": "Композити", "en": "Composites" },
      "descriptionI18n": { "uk": "Опис категорії", "en": "Category description" },
      "imageUrl": null,
      "sort": 1,
      "isActive": true,
      "createdAt": "2025-09-10T12:00:00.000Z",
      "updatedAt": "2025-09-10T12:00:00.000Z"
    }
  ]
  ```
- GET `/admin/categories/:id` — получить по id
  - 200 OK — `Category | null`
  - Пример ответа:
  ```
  {
    "_id": "6666000000000000000000c1",
    "slug": "composites",
    "nameI18n": { "uk": "Композити", "en": "Composites" },
    "descriptionI18n": { "uk": "Опис категорії", "en": "Category description" },
    "imageUrl": null,
    "sort": 1,
    "isActive": true,
    "createdAt": "2025-09-10T12:00:00.000Z",
    "updatedAt": "2025-09-10T12:00:00.000Z"
  }
  ```
- POST `/admin/categories` — создать
  - Body: `{ slug: string; nameI18n: { uk: string; en?: string }; descriptionI18n?: { uk?: string; en?: string }; imageUrl?: string; sort?: number; isActive?: boolean }`
  - 201 Created — созданная `Category`
- PATCH `/admin/categories/:id` — обновить
  - 200 OK — обновлённая `Category` или `null`
- DELETE `/admin/categories/:id` — удалить
  - 200 OK — удалённая `Category` или `null`

```bash
curl -H "x-api-key: $ADMIN_API_KEY" http://localhost:3000/admin/categories

curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"slug":"composites","nameI18n":{"uk":"Композити","en":"Composites"}}' \
  http://localhost:3000/admin/categories
```

### PATCH: добавить английский перевод категории

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"nameI18n":{"en":"Composites"},"descriptionI18n":{"en":"Category description"}}' \
  http://localhost:3000/admin/categories/<categoryId>
```

---

## Uploads

Base: `/admin/uploads`

- POST `/admin/uploads/image` — загрузить одно изображение в Cloudinary
  - Consumes: `multipart/form-data`
  - Body: `file` (binary), `folder?: string` — например: `products`, `categories`, `manufacturers`
  - Response 200 OK:

  ```
  {
    "url": "http://res.cloudinary.com/.../image/upload/v.../abc.jpg",
    "secure_url": "https://res.cloudinary.com/.../image/upload/v.../abc.jpg",
    "public_id": "products/abc",
    "width": 1024,
    "height": 768,
    "format": "jpg"
  }
  ```

  - Примечания:
    - Настройка окружения (одно из двух):
      1. Явно задать переменные окружения:
         - `CLOUDINARY_CLOUD_NAME=dsddgean7`
         - `CLOUDINARY_API_KEY=377684217728157`
         - `CLOUDINARY_API_SECRET=***` (не храните секрет в репозитории)
      2. Или одной строкой:
         - `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>`
           Сервис поддерживает оба способа и автоматически подхватит из доступных переменных.
    - Значение `public_id` можно хранить, если потребуется удаление файла через Cloudinary.
    - Для категорий/производителей/товаров/стран сохраняйте URL из ответа:
      - Category: `imageUrl`
      - Manufacturer: `logoUrl` и/или `bannerUrl`
      - Product: `images[]` на уровне товара, либо `variants[*].images[]` для варианта
      - Country: `flagUrl`
    - Рекомендуемые папки: `products`, `categories`, `manufacturers`, `countries`.

- POST `/admin/uploads/image/delete` — удалить изображение по `public_id`
  - Body: `{ "publicId": "products/abc" }`
  - Response 200 OK: `{ "result": "ok" }`

Пример:

```bash
curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"publicId":"products/abc"}' \
  http://localhost:3000/admin/uploads/image/delete
```

### Как загружать изображения и обновлять сущности

1. Загрузите файл через `/admin/uploads/image` с нужной папкой:

```bash
curl -X POST "http://localhost:3000/admin/uploads/image" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/absolute/path/to/image.jpg" \
  -F "folder=products"
```

2. Сохраните полученный URL в сущность соответствующим админ-эндпоинтом:

- Продукт (добавить картинку товара):

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"images":["https://res.cloudinary.com/.../image/upload/v.../prod-1.jpg"]}' \
  http://localhost:3000/admin/products/<productId>
```

- Продукт (добавить картинку варианта):

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"images":["https://res.cloudinary.com/.../image/upload/v.../var-1.jpg"]}' \
  http://localhost:3000/admin/products/<productId>/variants/<variantId>
```

- Категория:

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://res.cloudinary.com/.../image/upload/v.../cat.jpg"}' \
  http://localhost:3000/admin/categories/<categoryId>
```

- Производитель:

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"logoUrl":"https://res.cloudinary.com/.../image/upload/v.../logo.jpg","bannerUrl":"https://res.cloudinary.com/.../image/upload/v.../banner.jpg"}' \
  http://localhost:3000/admin/manufacturers/<manufacturerId>
```

- Страна:

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"flagUrl":"https://res.cloudinary.com/.../image/upload/v.../ua-flag.png"}' \
  http://localhost:3000/admin/countries/<countryId>
```

---

## Discounts (скидки)

Base: `/admin/discounts`

Discount model (admin):

```
{
  _id: string,
  name: string,
  description?: string,
  type: 'percent' | 'fixed',
  value: number,          // percent: 0..100; fixed: валютные единицы
  isActive: boolean,
  startsAt?: string,      // ISO
  endsAt?: string,        // ISO
  priority: number,       // больший применяется позже (для stackable) или выигрывает (для non-stackable)
  stackable: boolean,
  productIds: string[],
  categoryIds: string[],
  manufacturerIds: string[],
  countryIds: string[],
  tags: string[],
  createdAt: string,
  updatedAt: string
}
```

Правила применения:

- Учитываются только активные скидки в интервале дат (`startsAt`/`endsAt`).
- Таргетинг: скидка подходит, если совпадает хотя бы одна сущность каждой указанной группы. Пустой массив в группе означает "нет ограничения".
- Нестекаемые (`stackable=false`): выбирается одна лучшая, дающая минимальную цену.
- Стекаемые (`stackable=true`): применяются последовательно по возрастанию `priority` к результату предыдущего шага.

### List discounts

GET `/admin/discounts`

Query params:

- `q?: string` — search by name (case-insensitive)
- `isActive?: boolean` — filter by active state
- `sort?: string` — comma-separated fields, prefix with `-` for descending (default `-createdAt`)
- `page?: number` — default 1
- `limit?: number` — default 20, max 50

Response `200 OK`:

```
{ items: Discount[], page: number, limit: number, total: number }
```

### Get discount

GET `/admin/discounts/:id`

Response `200 OK`: `Discount | null`

### Create discount

POST `/admin/discounts`

Body:

```
{
  "name":"Autumn Sale",
  "type":"percent",
  "value":10,
  "isActive":true,
  "startsAt":"2025-09-01T00:00:00.000Z",
  "endsAt":"2025-09-30T23:59:59.999Z",
  "priority":10,
  "stackable":false,
  "categoryIds":["<catId>"],
  "productIds":[],
  "manufacturerIds":[],
  "countryIds":[],
  "tags":["sale"],
  "targetGroups": [
    {
      "categoryIds": ["<catId>"],
      "manufacturerIds": ["<manufacturerId>"],
      "tags": ["popular"]
    },
    {
      "productIds": ["<productId>"]
    }
  ]
}
```

Response `201 Created`: `Discount`

### Update discount

PATCH `/admin/discounts/:id`

Body: любые поля из модели (частичное обновление)

Response `200 OK`: `Discount | null`

### Bulk manage discount targets

PATCH `/admin/discounts/:id/targets`

- Purpose: Idемпотентное добавление таргетов к существующей скидке.
- Security: `x-api-key` или `Authorization: Bearer <token>`
- Body (любой поднабор полей):

```
{
  "productIds": ["<productId>", "..."],
  "categoryIds": ["<categoryId>"],
  "manufacturerIds": ["<manufacturerId>"],
  "countryIds": ["<countryId>"],
  "tags": ["consumables", "sale"],
  "targetGroups": [
    { "tags": ["sale"], "categoryIds": ["<categoryId>"] },
    { "productIds": ["<productId>"] }
  ]
}
```

Поведение: `$addToSet` с `$each` — дубликаты не добавляются. Пустые/отсутствующие поля игнорируются.

Пример:

```bash
curl -X PATCH "http://localhost:3000/admin/discounts/665aa.../targets" \
  -H "x-api-key: $ADMIN_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "categoryIds": ["665ab..."],
    "manufacturerIds": ["665ac..."],
    "tags": ["summer", "-clearance"]
  }'
```

PATCH `/admin/discounts/:id/targets/remove`

- Purpose: Массовое удаление таргетов из скидки.
- Security: `x-api-key` или `Authorization: Bearer <token>`
- Body: аналогичен предыдущему.

Поведение: `$pull` с `$in` — удаляет указанные элементы из соответствующих массивов. Пустые/отсутствующие поля игнорируются.

Пример:

```bash
curl -X PATCH "http://localhost:3000/admin/discounts/665aa.../targets/remove" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "content-type: application/json" \
  -d '{
    "productIds": ["665ad..."],
    "tags": ["-clearance"]
  }'
```

### Delete discount

DELETE `/admin/discounts/:id`

Response `200 OK`: `Discount | null`

Примечания:

- Скидки сразу учитываются в выдаче публичной витрины (варианты получают `priceFinal` и `discountsApplied`), а в заказах сохраняются снимки применённых скидок.
- Для прицельного эффекта можно комбинировать таргетинг по `productIds`/`categoryIds`/`manufacturerIds`/`countryIds`/`tags`.

Ответ будет содержать `url` и `secure_url`. Используйте одно из них как значение соответствующего поля.

## Notes for frontend implementation

- Для всех эндпоинтов `/admin/*` используйте либо `Authorization: Bearer <JWT>`, либо `x-api-key`.
- В товарах любые изменения массива `variants` в PATCH приводят к полному пересчёту агрегатов — не нужно вручную пересчитывать `priceMin/Max`, `optionsSummary`, `manufacturerIds`, `countryIds`.
- Скидки: в публичной витрине ответы по товарам дополнены полями со скидками:
  - на уровне варианта: `priceOriginal`, `priceFinal`, `discountsApplied[]` (в порядке применения)
  - на уровне товара: `priceMinFinal`, `priceMaxFinal` — рассчитаны по активным вариантам
    Эти поля не меняют исходные `priceMin/priceMax` и `variants[*].price` (они остаются исходными ценами без скидок).
- Для добавления/редактирования одного варианта используйте специальные эндпоинты `/variants` — это удобнее и безопаснее, чем править весь массив.
- `phone` в заказах фильтруется по нормализованному виду (E.164). Если на фронте номера в свободном формате — приведите к `+XXXXXXXXXXX`.
- Ошибки 400 для варианта товара означают конфликт SKU в рамках одного товара.
- В `GET /:id` и `PATCH/DELETE` для стран/производителей/категорий и заказов — при отсутствии сущности возвращается `null` (исключения не бросаются). Для PATCH товара и эндпоинтов вариантов — возвращается 404.

---

## Contacts (контакты/адреса)

Base: `/admin/contacts`

Кратко: карточки с адресом (i18n) и наборами контактов (телефоны, email, мессенджеры). Все поля опциональны; порядок показа — через `sort`. Поля `viber` и `telegram` — это массивы строк (как и `phones`).

- GET `/admin/contacts` — список всех карточек (включая неактивные), сортировка по `sort`, затем `createdAt`
- GET `/admin/contacts/:id` — получить карточку по id
- POST `/admin/contacts` — создать карточку
- PATCH `/admin/contacts/:id` — частичное обновление
- DELETE `/admin/contacts/:id` — удалить карточку

Тело создания (все поля опциональны):

```
{
  "addressI18n": { "uk": "м. Київ, вул. Хрещатик, 1", "en": "Kyiv, Khreshchatyk St, 1" },
  "phones": ["+380501234567", "+380971112233"],
  "email": "info@example.com",
  "viber": ["+380501234567", "+380671112233"],
  "telegram": ["@dentistry_store", "@dent_support"],
  "sort": 1,
  "isActive": true
}
```

См. подробности и примеры ответов: `docs/company-contacts.md`.

---

# Приложение: Общие схемы типов (JSON Schema)

Ниже указаны точные JSON Schema для основных сущностей админки. Эти схемы соответствуют текущим Mongoose-схемам и формам ответов.

Важно:

- Все `_id`, `categoryIds`, `manufacturerIds`, `countryIds` — строки формата ObjectId.
- `createdAt`/`updatedAt` — ISO строки дат.
- Для краткости примеры `additionalProperties` чаще указаны как `false` (можно снять, если на фронте нужен более гибкий приём структур).

## Schema: ProductVariant

```json
{
  "$id": "#/components/schemas/ProductVariant",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "sku": { "type": "string" },
    "manufacturerId": { "type": "string" },
    "countryId": { "type": ["string", "null"] },
    "options": {
      "type": "object",
      "additionalProperties": { "type": ["string", "number"] },
      "default": {}
    },
    "price": { "type": "number" },
    "unit": { "type": ["string", "null"] },
    "images": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "barcode": { "type": ["string", "null"] },
    "isActive": { "type": "boolean", "default": true },
    "variantKey": { "type": ["string", "null"] }
  },
  "required": ["sku", "manufacturerId", "price", "isActive"]
}
```

## Schema: Product

```json
{
  "$id": "#/components/schemas/Product",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "slug": { "type": "string" },
    "titleI18n": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "uk": { "type": "string" },
        "en": { "type": ["string", "null"] }
      },
      "required": ["uk"]
    },
    "descriptionI18n": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "properties": {
        "uk": { "type": ["string", "null"] },
        "en": { "type": ["string", "null"] }
      }
    },
    "categoryIds": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "images": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "attributes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "key": { "type": "string" },
          "value": { "type": ["string", "number", "boolean"] }
        },
        "required": ["key", "value"]
      },
      "default": []
    },
    "variants": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/ProductVariant" },
      "default": []
    },
    "manufacturerIds": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "countryIds": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "priceMin": { "type": "number", "default": 0 },
    "priceMax": { "type": "number", "default": 0 },
    "optionsSummary": {
      "type": "object",
      "additionalProperties": {
        "type": "array",
        "items": { "type": ["string", "number"] }
      },
      "default": {}
    },
    "isActive": { "type": "boolean", "default": true },
    "createdAt": { "type": ["string", "null"], "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["slug", "titleI18n", "variants", "isActive"]
}
```

## Schema: OrderItemSnapshot

```json
{
  "$id": "#/components/schemas/OrderItemSnapshot",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "productId": { "type": "string" },
    "sku": { "type": "string" },
    "quantity": { "type": "number", "minimum": 1 },
    "price": { "type": "number" },
    "priceOriginal": { "type": "number" },
    "title": { "type": "string" },
    "options": {
      "type": "object",
      "additionalProperties": { "type": ["string", "number"] },
      "default": {}
    },
    "manufacturerId": { "type": ["string", "null"] },
    "countryId": { "type": ["string", "null"] },
    "unit": { "type": ["string", "null"] },
    "discountsApplied": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "discountId": { "type": "string" },
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["percent", "fixed"] },
          "value": { "type": "number" },
          "priceBefore": { "type": "number" },
          "priceAfter": { "type": "number" }
        },
        "required": ["discountId", "name", "type", "value", "priceBefore", "priceAfter"]
      },
      "default": []
    }
  },
  "required": ["productId", "sku", "quantity", "price", "priceOriginal", "title"]
}
```

## Schema: Order

```json
{
  "$id": "#/components/schemas/Order",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "phone": { "type": "string" },
    "clientId": { "type": "string" },
    "items": {
      "type": "array",
      "items": { "$ref": "#/components/schemas/OrderItemSnapshot" },
      "default": []
    },
    "itemsTotal": { "type": "number" },
    "deliveryFee": { "type": "number", "default": 0 },
    "total": { "type": "number" },
    "status": { "type": "string", "enum": ["new", "processing", "done", "cancelled"] },
    "name": { "type": ["string", "null"] },
    "comment": { "type": ["string", "null"] },
    "createdAt": { "type": ["string", "null"], "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["phone", "clientId", "items", "itemsTotal", "total", "status"]
}
```

## Schema: Country

```json
{
  "$id": "#/components/schemas/Country",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "code": { "type": "string" },
    "nameI18n": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "uk": { "type": "string" },
        "en": { "type": ["string", "null"] }
      },
      "required": ["uk"]
    },
    "slug": { "type": "string" },
    "flagUrl": { "type": ["string", "null"] },
    "isActive": { "type": "boolean", "default": true },
    "createdAt": { "type": ["string", "null"], "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["code", "nameI18n", "slug", "isActive"]
}
```

## Schema: Manufacturer

```json
{
  "$id": "#/components/schemas/Manufacturer",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "nameI18n": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "uk": { "type": "string" },
        "en": { "type": ["string", "null"] }
      },
      "required": ["uk"]
    },
    "slug": { "type": "string" },
    "countryIds": {
      "type": "array",
      "items": { "type": "string" },
      "default": []
    },
    "logoUrl": { "type": ["string", "null"] },
    "bannerUrl": { "type": ["string", "null"] },
    "website": { "type": ["string", "null"] },
    "descriptionI18n": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "properties": {
        "uk": { "type": ["string", "null"] },
        "en": { "type": ["string", "null"] }
      }
    },
    "isActive": { "type": "boolean", "default": true },
    "createdAt": { "type": ["string", "null"], "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["nameI18n", "slug", "countryIds", "isActive"]
}
```

## Schema: Category

```json
{
  "$id": "#/components/schemas/Category",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "_id": { "type": "string" },
    "slug": { "type": "string" },
    "nameI18n": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "uk": { "type": "string" },
        "en": { "type": ["string", "null"] }
      },
      "required": ["uk"]
    },
    "descriptionI18n": {
      "type": ["object", "null"],
      "additionalProperties": false,
      "properties": {
        "uk": { "type": ["string", "null"] },
        "en": { "type": ["string", "null"] }
      }
    },
    "imageUrl": { "type": ["string", "null"] },
    "sort": { "type": ["number", "null"], "default": 0 },
    "isActive": { "type": "boolean", "default": true },
    "createdAt": { "type": ["string", "null"], "format": "date-time" },
    "updatedAt": { "type": ["string", "null"], "format": "date-time" }
  },
  "required": ["slug", "nameI18n", "isActive"]
}
```

---

## Hero (герой главной страницы)

Base: `/admin/hero`

Кратко: управляемый блок «герой» для главной страницы. Можно хранить несколько вариантов (черновики), но активным в витрине может быть только один. При включении одного — остальные автоматически выключаются.

- GET `/admin/hero` — получить последний созданный/обновлённый геро‑блок (для удобного редактирования)
- GET `/admin/hero/:id` — получить по id
- POST `/admin/hero` — создать
- PATCH `/admin/hero/:id` — частично обновить
- DELETE `/admin/hero/:id` — удалить

Модель (все поля опциональны, кроме служебных):

```
{
  _id: string,
  titleI18n?: { uk?: string; en?: string },
  subtitleI18n?: { uk?: string; en?: string },
  imageUrl?: string | null,        // десктоп
  imageUrlMobile?: string | null,  // мобилка
  videoUrl?: string | null,        // опционально
  cta?: {
    labelI18n?: { uk?: string; en?: string },
    url?: string | null,
    external?: boolean             // по умолчанию false
  },
  theme: 'light' | 'dark',         // по умолчанию 'light'
  isActive: boolean,               // по умолчанию false
  createdAt: string,
  updatedAt: string
}
```

Создание (пример):

```bash
curl -X POST -H "x-api-key: $ADMIN_API_KEY" -H "content-type: application/json" \
  -d '{
    "titleI18n": {"uk": "Стоматология, которой доверяют", "en": "Dentistry you trust"},
    "subtitleI18n": {"uk": "Здоровье зубов — наша забота"},
    "imageUrl": "https://res.cloudinary.com/.../hero-desktop.jpg",
    "imageUrlMobile": "https://res.cloudinary.com/.../hero-mobile.jpg",
    "cta": {"labelI18n": {"uk": "Перейти в каталог", "en": "Go to catalog"}, "url": "/catalog", "external": false},
    "theme": "light",
    "isActive": true
  }' \
  http://localhost:3000/admin/hero
```

Обновление (включить и выключить остальные):

```bash
curl -X PATCH -H "x-api-key: $ADMIN_API_KEY" -H "content-type: application/json" \
  -d '{"isActive": true}' \
  http://localhost:3000/admin/hero/<heroId>
```

Важно:

- Если `isActive=true` при POST/PATCH — все остальные геро‑документы автоматически получают `isActive=false`.
- Любые поля опциональны — можно сделать простой текстовый герой, только с картинкой, только с видео, с кнопкой/без кнопки и т. п.
- Изображения и видео можно загружать через `/admin/uploads/image` и подставлять URL в `imageUrl/imageUrlMobile/videoUrl`.
