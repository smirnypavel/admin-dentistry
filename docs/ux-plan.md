# Admin Panel UX Plan

Goal: Make product/content management obvious for a non-technical user coming from WordPress, while keeping it professional and scalable.

## UX principles

- Clarity first: simple language, avoid jargon. Use helpful empty states and hints.
- Few clicks to success: common tasks reachable within 1–2 clicks from the dashboard.
- Consistency: one mental model for all entities (list + filters + create/edit drawer + image upload).
- Inline help: short tips near fields, validation at point of action, undo where safe.
- Safety: confirmation for destructive actions, draft-friendly forms (preserve values on drawer close unless reset).
- Speed: server-side pagination, sensible defaults, keyboard navigation, quick actions.

## Information architecture & navigation

- Global left navigation (Sider): Dashboard, Orders, Products, Categories, Manufacturers, Countries, Admins, Settings.
- Dashboard: quick stats and shortcuts to "Add Product", "Add Category", etc.
- Entity pages pattern:
  - Header: Title + primary action (Add ...).
  - Content: Table with search/filter, columns optimized for scanning.
  - Right-side Drawer (or Modal) for Create/Edit to keep context.
- Breadcrumbs: show location; clicking parent navigates back.
- Sticky actions: Save/Cancel always visible in drawers.

## Common patterns

- List tables:
  - Top bar: Search (debounced), Filters (status/isActive), Reset, Add button.
  - Columns: Name/Slug/Status/UpdatedAt + quick actions (Edit/Delete/Toggle Active).
  - Selection: Bulk actions (optional later) like Activate/Deactivate/Delete.
- Forms (Create/Edit):
  - Grouping: Basics (name/slug/status), Media (image/logo), Details (description), Relations (for products: categories/manufacturers/countries), Advanced.
  - Slug helper: auto-generate from name; allow manual override with validation and uniqueness on save.
  - Image upload: visible preview, drag-and-drop, progress, replace/remove.
  - Validation: inline, with clear messages; disable Save until required fields valid.
  - Save flow: optimistic UI where safe, otherwise show loading and precise errors.
- Empty states: clear call-to-action (e.g., "No categories yet. Create your first category").
- Error states: clear explanations, link to retry, preserve inputs.

## Entity-specific flows

### Countries

- Use-cases: add a country (code, name, slug), set flag image, toggle active.
- List: code, name, slug, isActive, updatedAt.
- Form: code (required, unique), name, slug (auto from name), flag upload, isActive.

### Manufacturers

- Use-cases: add manufacturer, link to countries, set logo/banner, website, description.
- List: name, slug, countries count, isActive, updatedAt.
- Form: name, slug, countryIds (multi-select), logo upload, banner upload, website, description (markdown/plain), isActive.

### Categories

- Use-cases: add category, description, image, sort order, toggle active.
- List: image thumbnail, name, slug, sort, isActive, updatedAt.
- Form: name, slug (auto), description, image upload, sort (number), isActive.

### Products

- Use-cases: create product, manage variants, images, attributes, relations.
- List: title, slug, price range, active, updatedAt, variants count; search by title/description.
- Create/Edit wizard (2-step):
  1. Basics: title, slug, description, categories, tags, images, isActive.
  2. Variants manager: table of variants (sku, manufacturer, country, options, price, unit, barcode, isActive) with inline add/edit rows; guard unique SKU per product.
- Variant quick actions: enable/disable, edit price, edit options.

### Orders

- Use-cases: track and update status, filter by status/date/client, view items snapshot.
- List: id, phone, total, status, createdAt; filters by status/date; row click opens details drawer.
- Details drawer: customer info, items, totals, status change control with confirmation.

## Image upload UX

- Upload component (reusable): drag-and-drop area, choose file, show preview, upload on choose with progress, success/error state, replace/remove.
- API: POST `/admin/uploads/image` with `folder` per entity; on success, store returned `url` in the respective field.
- Accessibility: keyboard operable, alt text (optional).

## Search & filters

- Debounced search inputs; enter to submit; clear button.
- Persist last-used filters in URL (query-string) so refresh keeps context.

## Keyboard & productivity

- Enter to save in drawers; Esc to close (confirm if unsaved changes).
- Focus management: focus first invalid field; focus name on open.

## Onboarding & help

- First-run tips: small helper popovers on key screens.
- Docs link in header/footer; "What's new" on Dashboard.

## Settings (later)

- Global toggles: maintenance mode, contact details, etc.

## Implementation roadmap

1. Scaffolding & auth (done/verify login E2E).
2. Categories (list + create/edit with image upload; include slug auto + sort field).
3. Countries & Manufacturers (list + CRUD + uploads).
4. Products list; then product create/edit with variants manager (2-step wizard).
5. Orders list + detail drawer + status change.
6. Polishing: bulk actions, better filters, saved views, help tips.

## Acceptance criteria for each page

- Clear header with primary action.
- Table with search/filter; empty/error states.
- Drawer-based create/edit with validation and upload (where relevant).
- Persist filters in URL; restore on reload.
- Notifications on success/error; no spinner lock-ups.
- Responsive layout; works from 1280px+ comfortably; tolerable on 1024px.
