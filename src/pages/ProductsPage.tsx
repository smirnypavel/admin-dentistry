import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Tabs,
  Select,
  Space,
  Switch,
  Tooltip,
  Table,
  Tag,
  Typography,
  Upload,
  theme as antdTheme,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { uploadVideo } from "../api/uploads";
import { useQueryParam } from "../hooks/useQueryParam";
import {
  cloneProduct,
  createProduct,
  deleteProduct,
  listProducts,
  type ListProductsResponse,
  type Product,
  type ProductVariant,
  updateProduct,
} from "../api/products";
import dayjs from "dayjs";
import { ImageUploader } from "../components/ImageUploader";
import { MediaPicker } from "../components/MediaPicker";
import { ProductReorderDrawer } from "../components/ProductReorderDrawer";
import { slugify } from "../utils/slugify";
import { listCategories, type Category } from "../api/categories";
import { listSubcategories, type Subcategory } from "../api/subcategories";
import { listManufacturers, type Manufacturer } from "../api/manufacturers";
import { listCountries, type Country } from "../api/countries";
import {
  listDiscounts,
  addDiscountTargets,
  removeDiscountTargets,
  type Discount,
} from "../api/discounts";
import { useI18n } from "../store/i18n";

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  record?: Product | null;
  step: number; // kept for compatibility; single-form editor no longer uses steps
};

type OptionGroup = { name: string; values: string[] };

// Derive option groups (name → distinct values) from a list of variants
function deriveOptionGroups(
  vs: Array<{ options?: Record<string, string | number> }>,
): OptionGroup[] {
  const map = new Map<string, string[]>();
  for (const v of vs) {
    for (const [k, val] of Object.entries(v.options || {})) {
      const arr = map.get(k) ?? [];
      const sval = String(val);
      if (!arr.includes(sval)) arr.push(sval);
      map.set(k, arr);
    }
  }
  return Array.from(map.entries()).map(([name, values]) => ({ name, values }));
}

// Stable signature for a combination's option values (order-independent)
function optionsSignature(options: Record<string, string | number>): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}=${String(options[k])}`)
    .join("|");
}

// Cartesian product of option groups → list of option objects
function buildCombinations(
  groups: OptionGroup[],
): Array<Record<string, string>> {
  const active = groups.filter(
    (g) => g.name.trim() && g.values.length > 0,
  );
  if (active.length === 0) return [];
  let combos: Array<Record<string, string>> = [{}];
  for (const g of active) {
    const next: Array<Record<string, string>> = [];
    for (const combo of combos) {
      for (const val of g.values) {
        next.push({ ...combo, [g.name.trim()]: val });
      }
    }
    combos = next;
  }
  return combos;
}

export function ProductsPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  // Discrete selects write to the URL immediately (0ms) — debounce is only for
  // typed inputs; the delay caused "selects only on the second try".
  const [q, setQ] = useQueryParam("q", "");
  const [categoryId, setCategoryId] = useQueryParam("category", "", 0);
  const [subcategoryId, setSubcategoryId] = useQueryParam("subcategory", "", 0);
  const [manufacturerIds, setManufacturerIds] = useQueryParam(
    "manufacturerId",
    "",
    0,
  );
  const [countryIds, setCountryIds] = useQueryParam("countryId", "", 0);
  const [tagsFilter, setTagsFilter] = useQueryParam("tags", "", 0);
  const [isActiveStr, setIsActiveStr] = useQueryParam("isActive", "", 0);
  const [sort, setSort] = useQueryParam("sort", "order", 0);
  const [optKey, setOptKey] = useQueryParam("optk", "");
  const [optVal, setOptVal] = useQueryParam("optv", "");
  const [pageStr, setPageStr] = useQueryParam("page", "1", 0);
  const [limitStr, setLimitStr] = useQueryParam("limit", "20", 0);
  const page = Math.max(1, parseInt(pageStr || "1") || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitStr || "20") || 20));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListProductsResponse | null>(null);
  const items = data?.items || [];

  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: "create",
    record: null,
    step: 0,
  });

  const [form] = Form.useForm<{
    titleUk: string;
    titleEn?: string;
    slug: string;
    descUk?: string;
    descEn?: string;
    categoryIds: string[];
    subcategoryIds?: string[];
    tags?: string[];
    images?: string[];
    videos?: string[];
    attributes?: Array<{ key: string; value: string }>;
    isActive: boolean;
    isNew?: boolean;
    cashbackPercent?: number;
  }>();

  const [variants, setVariants] = useState<
    Array<ProductVariant & { _tmpId?: string }>
  >([]);
  // Option groups (e.g. "Розмір" → ["0.22"], "Тип" → ["Верхня щелепа", ...])
  const [optionGroups, setOptionGroups] = useState<
    Array<{ name: string; values: string[] }>
  >([]);
  // Product-level manufacturer/country applied to every generated combination
  const [variantManufacturerId, setVariantManufacturerId] = useState<
    string | undefined
  >();
  const [variantCountryId, setVariantCountryId] = useState<string | undefined>();
  // Row (_tmpId) of the combination whose price is shown in the catalog
  const [defaultVariantTmpId, setDefaultVariantTmpId] = useState<
    string | undefined
  >();
  const [editorTab, setEditorTab] = useState("basics");

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  // Hierarchical subcategory labels so managers can tell apart same-named
  // subgroups under different parents (e.g. Кусачки under ORTHOSTORE vs LE MED).
  const subcatLabel = useCallback(
    (s: Subcategory) => {
      const catName =
        categories.find((c) => c._id === s.categoryId)?.name || "?";
      const parent = s.parentSubcategoryId
        ? subcategories.find((p) => p._id === s.parentSubcategoryId)
        : undefined;
      return parent
        ? `${parent.name} → ${s.name} (${catName})`
        : `${s.name} (${catName})`;
    },
    [categories, subcategories],
  );
  // All subcategories as options, sorted so each parent is immediately followed
  // by its child subgroups.
  const subcatOptions = useMemo(() => {
    const catName = (id: string) =>
      categories.find((c) => c._id === id)?.name || "";
    const key = (s: Subcategory) => {
      const parent = s.parentSubcategoryId
        ? subcategories.find((p) => p._id === s.parentSubcategoryId)
        : undefined;
      return parent
        ? `${catName(s.categoryId)}|${parent.name}|1|${s.name}`
        : `${catName(s.categoryId)}|${s.name}|0|`;
    };
    return [...subcategories]
      .sort((a, b) => key(a).localeCompare(key(b), "uk"))
      .map((s) => ({ value: s._id, label: subcatLabel(s), categoryId: s.categoryId }));
  }, [subcategories, categories, subcatLabel]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState<"add" | "remove">("add");
  const [bulkDiscountId, setBulkDiscountId] = useState<string | undefined>();
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const loadRefs = useCallback(async () => {
    try {
      const [cats, mans, cnts, discs] = await Promise.all([
        listCategories(),
        listManufacturers(),
        listCountries(),
        listDiscounts({ page: 1, limit: 50, sort: "-createdAt" }).then(
          (r) => r.items,
        ),
      ]);
      const subs = await listSubcategories();
      setCategories(cats);
      setSubcategories(subs);
      setManufacturers(mans);
      setCountries(cnts);
      setDiscounts(discs);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        q: q || undefined,
        sort: sort || undefined,
        page,
        limit,
        category: categoryId || undefined,
        subcategory: subcategoryId || undefined,
        manufacturerId: manufacturerIds
          ? manufacturerIds.split(",").filter(Boolean)
          : undefined,
        countryId: countryIds
          ? countryIds.split(",").filter(Boolean)
          : undefined,
        tags: tagsFilter ? tagsFilter.split(",").filter(Boolean) : undefined,
        isActive: isActiveStr ? isActiveStr === "true" : undefined,
      } as const;

      const optParams = (() => {
        if (!optKey || !optVal) return {};
        const values = optVal
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const val: string | string[] = values.length > 1 ? values : values[0];
        return { [`opt.${optKey}`]: val } as unknown as {
          [K in `opt.${string}`]?: string | number | Array<string | number>;
        };
      })();

      const params: import("../api/products").ListProductsParams = {
        ...baseParams,
        ...optParams,
      };

      const res = await listProducts(params);
      setData(res);
    } catch {
      message.error(t("products.loadError"));
    } finally {
      setLoading(false);
    }
  }, [
    q,
    sort,
    categoryId,
    subcategoryId,
    manufacturerIds,
    countryIds,
    tagsFilter,
    isActiveStr,
    optKey,
    optVal,
    page,
    limit,
    message,
    t,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editor.open) {
      void loadRefs();
    }
  }, [editor.open, loadRefs]);

  // Load reference lists for filters on initial mount
  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  const onEdit = useCallback(
    (r: Product) => {
      setEditorTab("basics");
      setEditor({ open: true, mode: "edit", record: r, step: 0 });
      form.setFieldsValue({
        titleUk: r.titleI18n?.uk || r.title || "",
        titleEn: r.titleI18n?.en || "",
        slug: r.slug,
        descUk: r.descriptionI18n?.uk || "",
        descEn: r.descriptionI18n?.en || "",
        categoryIds: r.categoryIds || [],
        subcategoryIds: r.subcategoryIds || [],
        tags: r.tags || [],
        images: r.images || [],
        videos: r.videos || [],
        attributes: (r.attributes || []).map((a) => ({
          key: a.key,
          value: String(a.value ?? ""),
        })),
        isActive: r.isActive,
        isNew: r.isNew ?? false,
        cashbackPercent: r.cashbackPercent ?? 0,
      });
      const vs = (r.variants || []).map((v) => ({
        ...v,
        _tmpId: v._id || crypto.randomUUID(),
      }));
      setVariants(vs);
      setOptionGroups(deriveOptionGroups(vs));
      setVariantManufacturerId(
        vs[0]?.manufacturerId ? String(vs[0].manufacturerId) : undefined,
      );
      setVariantCountryId(
        vs[0]?.countryId ? String(vs[0].countryId) : undefined,
      );
      const defRow = r.defaultVariantSku
        ? vs.find((v) => v.sku === r.defaultVariantSku)
        : undefined;
      setDefaultVariantTmpId(defRow?._tmpId);
    },
    [form],
  );

  const onDelete = useCallback(
    (r: Product) => {
      modal.confirm({
        title: t("products.delete.title"),
        content: `${t("products.delete.confirm")} «${r.title}»?`,
        okText: t("common.delete"),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteProduct(r._id);
            message.success(t("products.delete.success"));
            await load();
          } catch {
            message.error(t("products.delete.error"));
          }
        },
      });
    },
    [load, message, modal, t],
  );

  const onClone = useCallback(
    (r: Product) => {
      modal.confirm({
        title: t("products.clone.title"),
        content: `${t("products.clone.confirm")} «${r.title}»?`,
        okText: t("products.clone.ok"),
        onOk: async () => {
          try {
            const created = await cloneProduct(r._id, {
              titlePrefix: t("products.clone.prefix"),
              skuSuffix: "-copy",
            });
            message.success(t("products.clone.success"));
            await load();
            onEdit(created); // open the copy for editing right away
          } catch {
            message.error(t("products.clone.error"));
          }
        },
      });
    },
    [load, message, modal, onEdit, t],
  );

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: t("products.columns.title"),
        dataIndex: "title",
        key: "title",
        render: (v: string, r) => (
          <Space
            direction="vertical"
            size={0}>
            <Typography.Text strong>{v}</Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12 }}>
              {r.slug}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t("products.columns.priceRange"),
        key: "priceRange",
        width: 160,
        render: (_: unknown, r) =>
          (r.priceMin ?? 0) === (r.priceMax ?? 0)
            ? (r.priceMin ?? 0)
            : `${r.priceMin ?? 0} – ${r.priceMax ?? 0}`,
      },
      {
        title: t("products.columns.discount"),
        key: "discount",
        width: 180,
        render: (_: unknown, r) => {
          if (!r.hasDiscount) return "—";
          const finalRange =
            (r.priceMinFinal ?? 0) === (r.priceMaxFinal ?? 0)
              ? String(r.priceMinFinal ?? 0)
              : `${r.priceMinFinal ?? 0} – ${r.priceMaxFinal ?? 0}`;
          const origMin = r.priceMin ?? 0;
          const finalMin = r.priceMinFinal ?? 0;
          const pct =
            origMin > 0 ? Math.round((1 - finalMin / origMin) * 100) : 0;
          return (
            <Space
              direction="vertical"
              size={0}>
              <Typography.Text
                type="success"
                strong>
                {finalRange}
              </Typography.Text>
              <Tag
                color="red"
                style={{ marginTop: 2 }}>
                −{pct}%
              </Tag>
            </Space>
          );
        },
      },
      {
        title: t("products.columns.variants"),
        key: "variantsCount",
        width: 120,
        render: (_: unknown, r) => r.variants?.length ?? 0,
      },
      {
        title: t("products.columns.isActive"),
        dataIndex: "isActive",
        key: "isActive",
        width: 100,
        render: (v: boolean) =>
          v ? (
            <Tag color="success">{t("common.yes")}</Tag>
          ) : (
            <Tag>{t("common.no")}</Tag>
          ),
      },
      {
        title: t("products.columns.createdAt"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (v?: string | null) =>
          v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—",
      },
      {
        title: t("common.actions"),
        key: "actions",
        width: 300,
        render: (_: unknown, r) => (
          <Space>
            <Button
              size="small"
              onClick={() => onEdit(r)}>
              {t("common.edit")}
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onClone(r)}>
              {t("products.clone.button")}
            </Button>
            <Button
              size="small"
              danger
              onClick={() => onDelete(r)}>
              {t("common.delete")}
            </Button>
          </Space>
        ),
      },
    ],
    [onEdit, onClone, onDelete, t],
  );

  const onCreate = () => {
    setEditorTab("basics");
    setEditor({ open: true, mode: "create", record: null, step: 0 });
    form.setFieldsValue({
      titleUk: "",
      titleEn: "",
      slug: "",
      descUk: "",
      descEn: "",
      categoryIds: [],
      subcategoryIds: [],
      tags: [],
      images: [],
      videos: [],
      isActive: true,
      isNew: false,
      cashbackPercent: 0,
    });
    setVariants([]);
    setOptionGroups([]);
    setVariantManufacturerId(undefined);
    setVariantCountryId(undefined);
    setDefaultVariantTmpId(undefined);
  };

  // moved: onEdit, onDelete wrapped in useCallback above

  const onSaveAll = async () => {
    // Validate basics inline first (surfaces the title error on its field)
    try {
      await form.validateFields();
    } catch {
      setEditorTab("basics");
      message.error(t("products.form.title.required"));
      return;
    }
    // Include values from unmounted basics form while on step 1
    const basics = form.getFieldsValue(true) as {
      titleUk?: string;
      titleEn?: string;
      slug?: string;
      descUk?: string;
      descEn?: string;
      categoryIds?: string[];
      subcategoryIds?: string[];
      tags?: string[];
      images?: string[];
      videos?: string[];
      attributes?: Array<{ key: string; value: string }>;
      isActive?: boolean;
      isNew?: boolean;
      cashbackPercent?: number;
    };
    // Safety net: ensure we have UA title (fallback to EN) and slug
    const titleUkTrim = (basics.titleUk || "").trim();
    const titleEnTrim = (basics.titleEn || "").trim();
    const titleUkFinal = titleUkTrim || titleEnTrim;
    if (!titleUkFinal) {
      message.error(t("products.form.title.required"));
      setEditor((s) => ({ ...s, step: 0 }));
      return;
    }
    if (!titleUkTrim && titleEnTrim) {
      basics.titleUk = titleEnTrim;
      form.setFieldValue("titleUk", titleEnTrim);
    }
    if (!basics.slug) {
      const base = (basics.titleUk || "").trim() || titleEnTrim;
      basics.slug = slugify(base);
      form.setFieldValue("slug", basics.slug);
    }
    const slugFinal = (basics.slug || slugify(titleUkFinal)) as string;
    const attributes = (basics.attributes || [])
      .filter((a) => (a.key || "").trim())
      .map(({ key, value }) => {
        const raw = (value ?? "").trim();
        let parsed: string | number | boolean = raw;
        if (/^true$/i.test(raw)) parsed = true;
        else if (/^false$/i.test(raw)) parsed = false;
        else if (!isNaN(Number(raw)) && raw !== "") parsed = Number(raw);
        return { key: key.trim(), value: parsed };
      });
    // Manufacturer is required per variant; it is set at product level and
    // applied to every combination.
    if (variants.length > 0 && !variantManufacturerId) {
      setEditorTab("variants");
      message.error(t("products.variants.manufacturer.required"));
      return;
    }
    // Send only fields the backend DTO allows — _id and variantKey are
    // forbidden (forbidNonWhitelisted) and are regenerated server-side.
    const preparedVariants: ProductVariant[] = variants.map((v) => ({
      sku: v.sku,
      manufacturerId: variantManufacturerId as string,
      countryId: variantCountryId || undefined,
      options: v.options || {},
      price: v.price,
      unit: v.unit || undefined,
      images: v.images || [],
      barcode: v.barcode || undefined,
      isActive: v.isActive,
    }));
    // Display SKU = SKU of the chosen combination row (if it has one)
    const resolvedDefaultSku =
      variants.find((v) => v._tmpId === defaultVariantTmpId)?.sku || undefined;
    try {
      if (editor.mode === "create") {
        await createProduct({
          slug: slugFinal,
          titleUk: (basics.titleUk as string) || titleUkFinal,
          titleEn: basics.titleEn || undefined,
          descUk: basics.descUk || undefined,
          descEn: basics.descEn || undefined,
          categoryIds: basics.categoryIds || [],
          subcategoryIds: basics.subcategoryIds || [],
          tags: basics.tags || [],
          images: basics.images || [],
          videos: basics.videos || [],
          attributes,
          variants: preparedVariants,
          isActive: basics.isActive,
          isNew: basics.isNew ?? false,
          cashbackPercent: basics.cashbackPercent ?? 0,
          defaultVariantSku: resolvedDefaultSku,
        });
        message.success(t("products.save.created"));
      } else if (editor.mode === "edit" && editor.record) {
        await updateProduct(editor.record._id, {
          slug: slugFinal,
          titleUk: (basics.titleUk as string) || titleUkFinal,
          titleEn: basics.titleEn || undefined,
          descUk: basics.descUk || undefined,
          descEn: basics.descEn || undefined,
          categoryIds: basics.categoryIds || [],
          subcategoryIds: basics.subcategoryIds || [],
          tags: basics.tags || [],
          images: basics.images || [],
          videos: basics.videos || [],
          attributes,
          variants: preparedVariants,
          isActive: basics.isActive,
          isNew: basics.isNew ?? false,
          cashbackPercent: basics.cashbackPercent ?? 0,
          defaultVariantSku: resolvedDefaultSku ?? "",
        });
        message.success(t("products.save.updated"));
      }
      setEditor({ open: false, mode: "create", record: null, step: 0 });
      await load();
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (e?.response?.status === 400) {
        message.error(
          e?.response?.data?.message || t("products.save.validation"),
        );
      } else {
        message.error(t("products.save.error"));
      }
    }
  };

  // ── Option groups management ───────────────────────────────────────────
  const addOptionGroup = () =>
    setOptionGroups((prev) => [...prev, { name: "", values: [] }]);

  const removeOptionGroup = (idx: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));

  const updateOptionGroup = (idx: number, patch: Partial<OptionGroup>) =>
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    );

  // Build combination rows from the option groups, preserving already-entered
  // SKU/price/active for combinations that still exist (matched by options).
  const regenerateCombinations = () => {
    const combos = buildCombinations(optionGroups);
    setVariants((prev) => {
      const bySig = new Map(
        prev.map((v) => [optionsSignature(v.options || {}), v]),
      );
      if (combos.length === 0) {
        const existing = prev[0];
        return [
          existing
            ? { ...existing, options: {} }
            : {
                _tmpId: crypto.randomUUID(),
                sku: "",
                manufacturerId: "",
                price: 0,
                isActive: true,
                options: {},
                images: [],
              },
        ];
      }
      return combos.map((options) => {
        const existing = bySig.get(optionsSignature(options));
        return existing
          ? { ...existing, options }
          : {
              _tmpId: crypto.randomUUID(),
              sku: "",
              manufacturerId: "",
              price: 0,
              isActive: true,
              options,
              images: [],
            };
      });
    });
  };

  const updateVariantField = useCallback(
    (
      tmpId: string,
      field: "sku" | "price" | "isActive",
      value: string | number | boolean,
    ) => {
      setVariants((prev) =>
        prev.map((v) =>
          v._tmpId === tmpId ? { ...v, [field]: value } : v,
        ),
      );
    },
    [],
  );

  // Table columns: one read-only column per option group + editable SKU/price/active
  const combinationColumns: ColumnsType<ProductVariant & { _tmpId?: string }> =
    useMemo(() => {
      const optionCols = optionGroups
        .filter((g) => g.name.trim())
        .map((g) => ({
          title: g.name.trim(),
          key: `opt_${g.name}`,
          render: (_: unknown, r: ProductVariant & { _tmpId?: string }) => (
            <Tag>{String(r.options?.[g.name.trim()] ?? "—")}</Tag>
          ),
        }));
      return [
        ...optionCols,
        {
          title: "SKU",
          key: "sku",
          width: 180,
          render: (_: unknown, r) => (
            <Input
              size="small"
              value={r.sku}
              placeholder="SKU"
              onChange={(e) =>
                updateVariantField(r._tmpId as string, "sku", e.target.value)
              }
            />
          ),
        },
        {
          title: t("products.variants.form.price"),
          key: "price",
          width: 150,
          render: (_: unknown, r) => (
            <InputNumber
              size="small"
              min={0}
              value={r.price}
              addonAfter="₴"
              style={{ width: 130 }}
              onChange={(val) =>
                updateVariantField(r._tmpId as string, "price", Number(val) || 0)
              }
            />
          ),
        },
        {
          title: t("products.variants.form.isActive"),
          key: "isActive",
          width: 90,
          render: (_: unknown, r) => (
            <Switch
              size="small"
              checked={r.isActive}
              onChange={(val) =>
                updateVariantField(r._tmpId as string, "isActive", val)
              }
            />
          ),
        },
        {
          title: (
            <Tooltip title={t("products.variants.displayPrice.tooltip")}>
              <span>{t("products.variants.displayPrice.title")}</span>
            </Tooltip>
          ),
          key: "displayPrice",
          width: 120,
          render: (_: unknown, r) => (
            <Tooltip
              title={
                r.sku ? "" : t("products.variants.displayPrice.needSku")
              }>
              <Radio
                checked={r._tmpId === defaultVariantTmpId}
                disabled={!r.sku}
                onChange={() => setDefaultVariantTmpId(r._tmpId)}
              />
            </Tooltip>
          ),
        },
      ];
    }, [optionGroups, updateVariantField, defaultVariantTmpId, t]);

  // Warn when SKUs repeat — they must be unique for catalog price / cart to work
  const hasDuplicateSkus = useMemo(() => {
    const seen = new Set<string>();
    for (const v of variants) {
      const s = (v.sku || "").trim();
      if (!s) continue;
      if (seen.has(s)) return true;
      seen.add(s);
    }
    return false;
  }, [variants]);

  // Price range across current variants (live feedback in the editor)
  const variantPriceRange = useMemo(() => {
    const prices = variants
      .map((v) => Number(v.price) || 0)
      .filter((p) => p > 0);
    if (!prices.length) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `${min} ₴` : `${min} – ${max} ₴`;
  }, [variants]);

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        {/* Page title removed (shown in header) */}
        <Space wrap>
          <Input
            placeholder={t("products.filters.search")}
            style={{ width: 240 }}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPageStr("1");
            }}
            allowClear
            onPressEnter={() => void load()}
          />
          <Select
            allowClear
            placeholder={t("products.filters.category.placeholder")}
            style={{ width: 220 }}
            value={categoryId || undefined}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            onChange={(v) => {
              setCategoryId(v ?? "");
              setSubcategoryId(""); // reset subcategory when category changes
              setPageStr("1");
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={!categoryId}
            placeholder={t("products.filters.subcategory.placeholder")}
            style={{ width: 220 }}
            value={subcategoryId || undefined}
            options={subcatOptions.filter((o) => o.categoryId === categoryId)}
            onChange={(v) => {
              setSubcategoryId(v ?? "");
              setPageStr("1");
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder={t("products.filters.manufacturers.placeholder")}
            style={{ width: 260 }}
            value={manufacturerIds ? manufacturerIds.split(",") : []}
            options={manufacturers.map((m) => ({
              value: m._id,
              label: m.name,
            }))}
            onChange={(vals) => {
              setManufacturerIds((vals as string[]).join(","));
              setPageStr("1");
            }}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder={t("products.filters.countries.placeholder")}
            style={{ width: 220 }}
            value={countryIds ? countryIds.split(",") : []}
            options={countries.map((c) => ({ value: c._id, label: c.name }))}
            onChange={(vals) => {
              setCountryIds((vals as string[]).join(","));
              setPageStr("1");
            }}
          />
          <Select
            mode="tags"
            allowClear
            placeholder={t("products.filters.tags.placeholder")}
            style={{ width: 220 }}
            value={tagsFilter ? tagsFilter.split(",") : []}
            onChange={(vals) => {
              setTagsFilter((vals as string[]).join(","));
              setPageStr("1");
            }}
          />
          <Select
            allowClear
            placeholder={t("products.filters.active.placeholder")}
            style={{ width: 160 }}
            value={isActiveStr || undefined}
            onChange={(v) => {
              setIsActiveStr(v ?? "");
              setPageStr("1");
            }}
            options={[
              { value: "true", label: t("products.filters.active.true") },
              { value: "false", label: t("products.filters.active.false") },
            ]}
          />
          <Input
            placeholder={t("products.filters.optKey")}
            style={{ width: 160 }}
            value={optKey}
            onChange={(e) => {
              setOptKey(e.target.value);
              setPageStr("1");
            }}
            allowClear
          />
          <Input
            placeholder={t("products.filters.optVal")}
            style={{ width: 220 }}
            value={optVal}
            onChange={(e) => {
              setOptVal(e.target.value);
              setPageStr("1");
            }}
            allowClear
          />
          <Select
            placeholder={t("products.filters.sort.placeholder")}
            style={{ width: 220 }}
            value={sort || undefined}
            onChange={(v) => {
              setSort(v ?? "");
              setPageStr("1");
            }}
            options={[
              {
                value: "order",
                label: t("products.filters.sort.manual"),
              },
              {
                value: "-createdAt",
                label: t("products.filters.sort.newFirst"),
              },
              {
                value: "createdAt",
                label: t("products.filters.sort.oldFirst"),
              },
              {
                value: "titleI18n.uk",
                label: t("products.filters.sort.titleAsc"),
              },
              {
                value: "-titleI18n.uk",
                label: t("products.filters.sort.titleDesc"),
              },
              {
                value: "priceMin",
                label: t("products.filters.sort.priceMinAsc"),
              },
              {
                value: "-priceMin",
                label: t("products.filters.sort.priceMinDesc"),
              },
              {
                value: "priceMax",
                label: t("products.filters.sort.priceMaxAsc"),
              },
              {
                value: "-priceMax",
                label: t("products.filters.sort.priceMaxDesc"),
              },
            ]}
            allowClear
          />
          <Tooltip
            title={
              categoryId ? "" : t("products.reorder.needCategory")
            }>
            <Button
              disabled={!categoryId}
              onClick={() => setReorderOpen(true)}>
              {t("products.reorder.button")}
            </Button>
          </Tooltip>
          <Button
            type="primary"
            onClick={onCreate}>
            {t("common.create")}
          </Button>
        </Space>

        <Table
          rowKey="_id"
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            onChange: (p, ps) => {
              setPageStr(String(p));
              setLimitStr(String(ps));
            },
            showTotal: (total, range) =>
              `${range[0]}–${range[1]} ${t("common.of")} ${total}`,
          }}
        />

        <Space>
          <Button
            disabled={!selectedRowKeys.length}
            onClick={() => {
              setBulkMode("add");
              setBulkVisible(true);
            }}>
            {t("products.bulk.applyToSelected")}
          </Button>
          <Button
            disabled={!selectedRowKeys.length}
            danger
            onClick={() => {
              setBulkMode("remove");
              setBulkVisible(true);
            }}>
            {t("products.bulk.removeFromSelected")}
          </Button>
        </Space>

        <Drawer
          open={editor.open}
          width={900}
          onClose={() =>
            setEditor({ open: false, mode: "create", record: null, step: 0 })
          }
          title={
            editor.mode === "create"
              ? t("products.editor.createTitle")
              : t("products.editor.editTitle")
          }
          extra={
            <Space>
              <Button
                onClick={() =>
                  setEditor({
                    open: false,
                    mode: "create",
                    record: null,
                    step: 0,
                  })
                }>
                {t("common.cancel")}
              </Button>
              <Button
                type="primary"
                onClick={onSaveAll}>
                {t("common.save")}
              </Button>
            </Space>
          }>
          <>
            <Form
              layout="vertical"
              form={form}
              initialValues={{ isActive: true, images: [], attributes: [] }}
              onValuesChange={(changed) => {
                if ("titleUk" in changed || "titleEn" in changed) {
                  const currentSlug = (form.getFieldValue("slug") || "").trim();
                  if (currentSlug) return;
                  const uk = (form.getFieldValue("titleUk") || "").trim();
                  const en = (form.getFieldValue("titleEn") || "").trim();
                  const base = uk || en;
                  if (base) form.setFieldsValue({ slug: slugify(base) });
                }
              }}>
              <Tabs
                activeKey={editorTab}
                onChange={setEditorTab}
                items={[
                  {
                    key: "basics",
                    label: t("products.section.basics"),
                    forceRender: true,
                    children: (
                      <>
                        <Tabs
                          items={[
                  {
                    key: "uk",
                    label: t("products.form.lang.uk") || "Українська",
                    children: (
                      <>
                        <Form.Item
                          label={t("products.form.title")}
                          name="titleUk"
                          // Custom validation: require at least one of UA or EN titles
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const uk = (value || "").trim();
                                const en = (
                                  getFieldValue("titleEn") || ""
                                ).trim();
                                if (uk || en) return Promise.resolve();
                                return Promise.reject(
                                  new Error(t("products.form.title.required")),
                                );
                              },
                            }),
                          ]}>
                          <Input
                            data-gramm="false"
                            data-gramm_editor="false"
                            onBlur={() => {
                              const v = (
                                form.getFieldValue("titleUk") || ""
                              ).trim();
                              const en = (
                                form.getFieldValue("titleEn") || ""
                              ).trim();
                              if (!v && en) {
                                form.setFieldValue("titleUk", en);
                              }
                              const s = form.getFieldValue("slug");
                              const base = v || en;
                              if (!s && base)
                                form.setFieldValue("slug", slugify(base));
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("products.form.description")}
                          name="descUk">
                          <Input.TextArea
                            rows={4}
                            data-gramm="false"
                            data-gramm_editor="false"
                          />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "en",
                    label: t("products.form.lang.en") || "English",
                    children: (
                      <>
                        <Form.Item
                          label={t("products.form.titleEn")}
                          name="titleEn">
                          <Input
                            data-gramm="false"
                            data-gramm_editor="false"
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("products.form.descriptionEn")}
                          name="descEn">
                          <Input.TextArea
                            rows={4}
                            data-gramm="false"
                            data-gramm_editor="false"
                          />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
              <Form.Item
                label={t("products.form.slug")}
                name="slug"
                tooltip={t("products.form.slug.tooltip")}
                extra={(() => {
                  const hint = t("products.form.slug.hint");
                  return hint && hint !== "products.form.slug.hint"
                    ? hint
                    : "Слаг формируется автоматически из названия. Можно оставить как есть.";
                })()}>
                <Input
                  data-gramm="false"
                  data-gramm_editor="false"
                />
              </Form.Item>
              <Form.Item
                label={t("products.form.categories")}
                name="categoryIds">
                <Select
                  mode="multiple"
                  placeholder={t("products.form.categories.placeholder")}
                  options={categories.map((c) => ({
                    value: c._id,
                    label: c.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                label={t("products.form.subcategories") || "Подкатегории"}
                name="subcategoryIds">
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("products.form.subcategories.placeholder")}
                  options={subcatOptions}
                />
              </Form.Item>
              <Form.Item
                label={t("products.form.tags")}
                name="tags">
                <Select
                  mode="tags"
                  placeholder={t("products.form.tags.placeholder")}
                />
              </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "attributes",
                    label: t("products.section.attributes"),
                    forceRender: true,
                    children: (
                      <>
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginBottom: 16 }}
                          message={t("products.attributes.help.title")}
                          description={t("products.attributes.help.desc")}
                        />
                        <Form.Item label={t("products.form.attributes")}>
                <Form.List name="attributes">
                  {(fields, { add, remove }) => (
                    <Space
                      direction="vertical"
                      style={{ width: "100%" }}>
                      {fields.map(({ key, name, ...restField }) => (
                        <Space
                          key={key}
                          align="baseline"
                          wrap>
                          <Form.Item
                            {...restField}
                            name={[name, "key"]}
                            rules={[
                              {
                                required: true,
                                message: t("products.form.attr.key.required"),
                              },
                            ]}
                            style={{ width: 220 }}>
                            <Input
                              placeholder={t(
                                "products.form.attr.key.placeholder",
                              )}
                            />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "value"]}
                            rules={[
                              {
                                required: true,
                                message: t("products.form.attr.value.required"),
                              },
                            ]}
                            style={{ width: 260 }}>
                            <Input
                              placeholder={t(
                                "products.form.attr.value.placeholder",
                              )}
                            />
                          </Form.Item>
                          <Button
                            danger
                            onClick={() => remove(name)}>
                            {t("common.delete")}
                          </Button>
                        </Space>
                      ))}
                      <Button onClick={() => add({ key: "", value: "" })}>
                        {t("products.form.attr.add")}
                      </Button>
                    </Space>
                  )}
                </Form.List>
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "media",
                    label: t("products.section.media"),
                    children: (
                      <>
                        <Form.Item
                          label={t("products.form.images")}
                          shouldUpdate>
                {() => {
                  const imgs: string[] = form.getFieldValue("images") || [];
                  return (
                    <Space direction="vertical">
                      <Space wrap>
                        {imgs.map((url, idx) => (
                          <ImageUploader
                            key={idx}
                            value={url}
                            onChange={(nu) => {
                              const next = [...imgs];
                              if (nu) next[idx] = nu;
                              else next.splice(idx, 1);
                              form.setFieldValue("images", next);
                            }}
                            folder="products"
                            showMediaPicker={false}
                          />
                        ))}
                      </Space>
                      <Space>
                        <ImageUploader
                          value={null}
                          onChange={(nu) => {
                            if (nu) form.setFieldValue("images", [...imgs, nu]);
                          }}
                          folder="products"
                          showMediaPicker={false}
                        />
                        <Button onClick={() => setMediaPickerOpen(true)}>
                          {t("products.form.selectFromMedia")}
                        </Button>
                      </Space>
                    </Space>
                  );
                }}
              </Form.Item>
              <MediaPicker
                open={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                initialFolder="products"
                onSelect={(urls) => {
                  const imgs: string[] = form.getFieldValue("images") || [];
                  const merged = [...imgs, ...urls.filter((u) => !imgs.includes(u))];
                  form.setFieldValue("images", merged);
                }}
                        />
                        <Form.Item
                          label={t("products.form.videos")}
                          tooltip={t("products.form.videos.tooltip")}
                          shouldUpdate>
                          {() => {
                            const vids: string[] =
                              form.getFieldValue("videos") || [];
                            return (
                              <Space direction="vertical" style={{ width: "100%" }}>
                                <Space wrap>
                                  {vids.map((url, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        border: "1px solid #f0f0f0",
                                        borderRadius: 8,
                                        padding: 6,
                                      }}>
                                      <video
                                        src={url}
                                        controls
                                        style={{
                                          width: 220,
                                          height: 130,
                                          background: "#000",
                                          borderRadius: 4,
                                          display: "block",
                                        }}
                                      />
                                      <Button
                                        danger
                                        size="small"
                                        block
                                        icon={<DeleteOutlined />}
                                        style={{ marginTop: 4 }}
                                        onClick={() =>
                                          form.setFieldValue(
                                            "videos",
                                            vids.filter((_, i) => i !== idx),
                                          )
                                        }>
                                        {t("common.delete")}
                                      </Button>
                                    </div>
                                  ))}
                                </Space>
                                <Upload
                                  accept="video/*"
                                  showUploadList={false}
                                  beforeUpload={(file) => {
                                    if (file.size / (1024 * 1024) > 100) {
                                      message.error(
                                        t("products.form.videos.tooBig"),
                                      );
                                      return false;
                                    }
                                    setVideoUploading(true);
                                    uploadVideo(
                                      file as unknown as File,
                                      "products/videos",
                                    )
                                      .then((res) => {
                                        const cur: string[] =
                                          form.getFieldValue("videos") || [];
                                        form.setFieldValue("videos", [
                                          ...cur,
                                          res.secure_url || res.url,
                                        ]);
                                        message.success(
                                          t("products.form.videos.uploaded"),
                                        );
                                      })
                                      .catch(() =>
                                        message.error(
                                          t("products.form.videos.error"),
                                        ),
                                      )
                                      .finally(() => setVideoUploading(false));
                                    return false;
                                  }}>
                                  <Button
                                    icon={<UploadOutlined />}
                                    loading={videoUploading}>
                                    {t("products.form.videos.upload")}
                                  </Button>
                                </Upload>
                              </Space>
                            );
                          }}
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "settings",
                    label: t("products.section.settings"),
                    forceRender: true,
                    children: (
                      <>
                        <Form.Item
                          label={t("products.form.isActive")}
                name="isActive"
                valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                label={t("products.form.isNew")}
                name="isNew"
                valuePropName="checked">
                <Switch />
              </Form.Item>
                        <Form.Item
                          label="Кешбек %"
                          name="cashbackPercent"
                          tooltip="Відсоток кешбеку для покупця (0 = без кешбеку, напр. 5 = 5%)">
                          <InputNumber min={0} max={100} precision={0} style={{ width: 120 }} addonAfter="%" placeholder="0" />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    key: "variants",
                    label: `${t("products.section.variants")} (${variants.length})`,
                    children: (
                      <Space
                        direction="vertical"
                        style={{ width: "100%" }}
                        size="large">
                        <Alert
                          type="info"
                          showIcon
                          message={t("products.variants.help.title")}
                          description={t("products.variants.help.desc")}
                        />

                        {/* Product-level manufacturer / country */}
                        <Space wrap size="large">
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              {t("products.variants.form.manufacturer")}{" "}
                              <span style={{ color: "#ff4d4f" }}>*</span>
                            </div>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={t("products.variants.form.manufacturer")}
                              style={{ width: 280 }}
                              value={variantManufacturerId}
                              onChange={(v) => setVariantManufacturerId(v)}
                              options={manufacturers.map((m) => ({
                                value: m._id,
                                label: m.name,
                              }))}
                            />
                          </div>
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              {t("products.variants.form.country")}
                            </div>
                            <Select
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              placeholder={t("products.variants.form.country")}
                              style={{ width: 240 }}
                              value={variantCountryId}
                              onChange={(v) => setVariantCountryId(v)}
                              options={countries.map((c) => ({
                                value: c._id,
                                label: c.name,
                              }))}
                            />
                          </div>
                        </Space>

                        {/* Option groups */}
                        <div>
                          <Typography.Text strong>
                            {t("products.variants.optionGroups.title")}
                          </Typography.Text>
                          <Typography.Paragraph
                            type="secondary"
                            style={{ fontSize: 12, margin: "4px 0 12px" }}>
                            {t("products.variants.optionGroups.hint")}
                          </Typography.Paragraph>
                          <Space direction="vertical" style={{ width: "100%" }}>
                            {optionGroups.map((g, idx) => (
                              <Space key={idx} align="baseline" wrap>
                                <Input
                                  placeholder={t(
                                    "products.variants.optionGroups.name.placeholder",
                                  )}
                                  style={{ width: 200 }}
                                  value={g.name}
                                  onChange={(e) =>
                                    updateOptionGroup(idx, { name: e.target.value })
                                  }
                                />
                                <Select
                                  mode="tags"
                                  style={{ minWidth: 320 }}
                                  placeholder={t(
                                    "products.variants.optionGroups.values.placeholder",
                                  )}
                                  value={g.values}
                                  onChange={(vals) =>
                                    updateOptionGroup(idx, { values: vals })
                                  }
                                  tokenSeparators={[","]}
                                />
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => removeOptionGroup(idx)}
                                />
                              </Space>
                            ))}
                            <Space>
                              <Button
                                icon={<PlusOutlined />}
                                onClick={addOptionGroup}>
                                {t("products.variants.optionGroups.add")}
                              </Button>
                              <Button
                                type="primary"
                                onClick={regenerateCombinations}>
                                {t("products.variants.generate")}
                              </Button>
                            </Space>
                          </Space>
                        </div>

                        {/* Combinations */}
                        <div>
                          <Space
                            style={{
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                            wrap>
                            <Typography.Text strong>
                              {t("products.variants.combinations.title")}
                            </Typography.Text>
                            {variantPriceRange && (
                              <Typography.Text type="secondary">
                                {t("products.variants.priceRange")}:{" "}
                                {variantPriceRange}
                              </Typography.Text>
                            )}
                          </Space>

                          {variants.length === 0 ? (
                            <Alert
                              style={{ marginTop: 12 }}
                              type="warning"
                              showIcon
                              message={t("products.variants.empty.title")}
                              description={t("products.variants.empty.hint")}
                            />
                          ) : (
                            <>
                              {hasDuplicateSkus && (
                                <Alert
                                  style={{ marginTop: 12 }}
                                  type="warning"
                                  showIcon
                                  message={t("products.variants.dupSku.title")}
                                  description={t("products.variants.dupSku.hint")}
                                />
                              )}
                              <Table
                                style={{ marginTop: 12 }}
                                rowKey={(r) => r._id || r._tmpId || r.sku}
                                columns={combinationColumns}
                                dataSource={variants}
                                pagination={false}
                                size="small"
                                scroll={{ x: "max-content" }}
                              />
                            </>
                          )}
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </Form>
          </>
        </Drawer>

        <Drawer
          open={bulkVisible}
          width={520}
          onClose={() => setBulkVisible(false)}
          title={
            bulkMode === "add"
              ? t("products.bulk.drawer.title.add")
              : t("products.bulk.drawer.title.remove")
          }
          extra={
            <Space>
              <Button
                type="primary"
                disabled={!bulkDiscountId && bulkMode === "add"}
                onClick={async () => {
                  const productIds = selectedRowKeys.map(String);
                  try {
                    if (bulkMode === "add") {
                      if (!bulkDiscountId) return;
                      await addDiscountTargets(bulkDiscountId, { productIds });
                    } else {
                      if (!bulkDiscountId) return;
                      await removeDiscountTargets(bulkDiscountId, {
                        productIds,
                      });
                    }
                    message.success(
                      bulkMode === "add"
                        ? t("products.bulk.success.add")
                        : t("products.bulk.success.remove"),
                    );
                    setBulkVisible(false);
                    setSelectedRowKeys([]);
                  } catch {
                    message.error(t("products.bulk.error"));
                  }
                }}>
                {t("products.bulk.run")}
              </Button>
            </Space>
          }>
          <Space
            direction="vertical"
            style={{ width: "100%" }}>
            <div>
              {t("products.bulk.selectedCount")}: {selectedRowKeys.length}
            </div>
            <Select
              placeholder={t("products.bulk.select.placeholder")}
              value={bulkDiscountId}
              onChange={(v) => setBulkDiscountId(v)}
              options={discounts.map((d) => ({ value: d._id, label: d.name }))}
              style={{ width: "100%" }}
            />
            <div style={{ color: token.colorTextSecondary }}>
              {t("products.bulk.note")}
            </div>
          </Space>
        </Drawer>

        <ProductReorderDrawer
          open={reorderOpen}
          categoryId={categoryId}
          categoryName={
            categories.find((c) => c._id === categoryId)?.name || undefined
          }
          subcategoryId={subcategoryId}
          subcategoryName={
            subcategories.find((s) => s._id === subcategoryId)?.name || undefined
          }
          onClose={() => setReorderOpen(false)}
          onSaved={() => void load()}
        />
      </Space>
    </AdminLayout>
  );
}
