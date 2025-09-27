import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Tabs,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQueryParam } from "../hooks/useQueryParam";
import {
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
import { slugify } from "../utils/slugify";
import { listCategories, type Category } from "../api/categories";
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
  step: number; // 0 basics, 1 variants
};

export function ProductsPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [q, setQ] = useQueryParam("q", "");
  const [categoryId, setCategoryId] = useQueryParam("category", "");
  const [manufacturerIds, setManufacturerIds] = useQueryParam(
    "manufacturerId",
    ""
  );
  const [countryIds, setCountryIds] = useQueryParam("countryId", "");
  const [tagsFilter, setTagsFilter] = useQueryParam("tags", "");
  const [isActiveStr, setIsActiveStr] = useQueryParam("isActive", "");
  const [sort, setSort] = useQueryParam("sort", "-createdAt");
  const [optKey, setOptKey] = useQueryParam("optk", "");
  const [optVal, setOptVal] = useQueryParam("optv", "");
  const [pageStr, setPageStr] = useQueryParam("page", "1");
  const [limitStr, setLimitStr] = useQueryParam("limit", "20");
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
    tags?: string[];
    images?: string[];
    attributes?: Array<{ key: string; value: string }>;
    isActive: boolean;
  }>();

  const [variantForm] = Form.useForm<ProductVariant & { _tmpId?: string }>();
  const [variants, setVariants] = useState<
    Array<ProductVariant & { _tmpId?: string }>
  >([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [bulkMode, setBulkMode] = useState<"add" | "remove">("add");
  const [bulkDiscountId, setBulkDiscountId] = useState<string | undefined>();

  const loadRefs = useCallback(async () => {
    try {
      const [cats, mans, cnts, discs] = await Promise.all([
        listCategories(),
        listManufacturers(),
        listCountries(),
        listDiscounts({ page: 1, limit: 50, sort: "-createdAt" }).then(
          (r) => r.items
        ),
      ]);
      setCategories(cats);
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
      setEditor({ open: true, mode: "edit", record: r, step: 0 });
      form.setFieldsValue({
        titleUk: r.titleI18n?.uk || r.title || "",
        titleEn: r.titleI18n?.en || "",
        slug: r.slug,
        descUk: r.descriptionI18n?.uk || "",
        descEn: r.descriptionI18n?.en || "",
        categoryIds: r.categoryIds || [],
        tags: r.tags || [],
        images: r.images || [],
        attributes: (r.attributes || []).map((a) => ({
          key: a.key,
          value: String(a.value ?? ""),
        })),
        isActive: r.isActive,
      });
      setVariants(
        (r.variants || []).map((v) => ({
          ...v,
          _tmpId: v._id || crypto.randomUUID(),
        }))
      );
    },
    [form]
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
    [load, message, modal, t]
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
        width: 220,
        render: (_: unknown, r) => (
          <Space>
            <Button
              size="small"
              onClick={() => onEdit(r)}>
              {t("common.edit")}
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
    [onEdit, onDelete, t]
  );

  const onCreate = () => {
    setEditor({ open: true, mode: "create", record: null, step: 0 });
    form.setFieldsValue({
      titleUk: "",
      titleEn: "",
      slug: "",
      descUk: "",
      descEn: "",
      categoryIds: [],
      tags: [],
      images: [],
      isActive: true,
    });
    setVariants([]);
  };

  // moved: onEdit, onDelete wrapped in useCallback above

  const onSubmitBasics = async () => {
    try {
      const values = await form.validateFields();
      // If UA title is empty but EN is present, auto-fill UA from EN
      const titleUkTrim = (values.titleUk || "").trim();
      const titleEnTrim = (values.titleEn || "").trim();
      if (!titleUkTrim && titleEnTrim) {
        form.setFieldValue("titleUk", titleEnTrim);
      }
      // Generate slug from whichever title is available
      if (!values.slug) {
        const base = titleUkTrim || titleEnTrim || "";
        if (base) {
          const nextSlug = slugify(base);
          values.slug = nextSlug;
          form.setFieldValue("slug", nextSlug);
        }
      }
      setEditor((s) => ({ ...s, step: 1 }));
    } catch {
      // ignore
    }
  };

  const onSaveAll = async () => {
    // Include values from unmounted basics form while on step 1
    const basics = form.getFieldsValue(true) as {
      titleUk?: string;
      titleEn?: string;
      slug?: string;
      descUk?: string;
      descEn?: string;
      categoryIds?: string[];
      tags?: string[];
      images?: string[];
      attributes?: Array<{ key: string; value: string }>;
      isActive?: boolean;
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
    const preparedVariants: ProductVariant[] = variants.map((v) => ({
      _id: v._id,
      sku: v.sku,
      manufacturerId: v.manufacturerId,
      countryId: v.countryId || undefined,
      options: v.options || {},
      price: v.price,
      unit: v.unit || undefined,
      images: v.images || [],
      barcode: v.barcode || undefined,
      isActive: v.isActive,
      variantKey: v.variantKey,
    }));
    try {
      if (editor.mode === "create") {
        await createProduct({
          slug: slugFinal,
          titleUk: (basics.titleUk as string) || titleUkFinal,
          titleEn: basics.titleEn || undefined,
          descUk: basics.descUk || undefined,
          descEn: basics.descEn || undefined,
          categoryIds: basics.categoryIds || [],
          tags: basics.tags || [],
          images: basics.images || [],
          attributes,
          variants: preparedVariants,
          isActive: basics.isActive,
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
          tags: basics.tags || [],
          images: basics.images || [],
          attributes,
          variants: preparedVariants,
          isActive: basics.isActive,
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
          e?.response?.data?.message || t("products.save.validation")
        );
      } else {
        message.error(t("products.save.error"));
      }
    }
  };

  const onEditVariant = useCallback(
    (v: ProductVariant & { _tmpId?: string }) => {
      variantForm.setFieldsValue({ ...v });
    },
    [variantForm]
  );

  const onRemoveVariant = useCallback(
    (v: ProductVariant & { _tmpId?: string }) => {
      setVariants((prev) =>
        prev.filter((x) => (x._id ? x._id !== v._id : x._tmpId !== v._tmpId))
      );
    },
    []
  );

  const variantColumns: ColumnsType<ProductVariant & { _tmpId?: string }> =
    useMemo(
      () => [
        { title: "SKU", dataIndex: "sku", key: "sku", width: 160 },
        {
          title: t("products.variants.table.manufacturer"),
          dataIndex: "manufacturerId",
          key: "manufacturerId",
          width: 200,
          render: (v: string) =>
            manufacturers.find((m) => m._id === v)?.name || v,
        },
        {
          title: t("products.variants.table.country"),
          dataIndex: "countryId",
          key: "countryId",
          width: 160,
          render: (v?: string) =>
            v ? countries.find((c) => c._id === v)?.name || v : "—",
        },
        {
          title: t("products.variants.table.price"),
          dataIndex: "price",
          key: "price",
          width: 120,
        },
        {
          title: t("products.variants.table.unit"),
          dataIndex: "unit",
          key: "unit",
          width: 80,
          render: (v?: string) => v || "—",
        },
        {
          title: t("products.variants.table.barcode"),
          dataIndex: "barcode",
          key: "barcode",
          width: 160,
          render: (v?: string) => v || "—",
        },
        {
          title: t("products.variants.table.options"),
          key: "options",
          render: (_: unknown, r) => (
            <Space wrap>
              {Object.entries(r.options || {}).map(([k, v]) => (
                <Tag key={k}>{`${k}: ${String(v)}`}</Tag>
              ))}
            </Space>
          ),
        },
        {
          title: t("products.variants.table.isActive"),
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
          title: t("common.actions"),
          key: "actions",
          width: 180,
          render: (_: unknown, r) => (
            <Space>
              <Button
                size="small"
                onClick={() => onEditVariant(r)}>
                {t("common.edit")}
              </Button>
              <Button
                size="small"
                danger
                onClick={() => onRemoveVariant(r)}>
                {t("common.delete")}
              </Button>
            </Space>
          ),
        },
      ],
      [manufacturers, countries, onEditVariant, onRemoveVariant, t]
    );

  const onAddVariant = () => {
    variantForm.resetFields();
    setVariants((prev) => [
      {
        _tmpId: crypto.randomUUID(),
        sku: "",
        manufacturerId: "",
        price: 0,
        isActive: true,
        options: {},
        images: [],
        unit: undefined,
        barcode: undefined,
        countryId: undefined,
      },
      ...prev,
    ]);
  };

  // moved: handlers wrapped in useCallback above

  const onApplyVariant = async () => {
    try {
      const v = await variantForm.validateFields();
      setVariants((prev) => {
        const idx = prev.findIndex((x) =>
          x._id ? x._id === v._id : x._tmpId === v._tmpId
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...v };
          return copy;
        }
        return [{ _tmpId: crypto.randomUUID(), ...v }, ...prev];
      });
      message.success("Вариант сохранён в черновике");
    } catch {
      // validation errors
    }
  };

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
              {editor.step === 0 ? (
                <Button
                  type="primary"
                  onClick={onSubmitBasics}>
                  {t("products.editor.next")}
                </Button>
              ) : (
                <>
                  <Button onClick={() => setEditor((s) => ({ ...s, step: 0 }))}>
                    {t("common.back")}
                  </Button>
                  <Button
                    type="primary"
                    onClick={onSaveAll}>
                    {t("common.save")}
                  </Button>
                </>
              )}
            </Space>
          }>
          <Steps
            items={[
              { title: t("products.steps.basics") },
              { title: t("products.steps.variants") },
            ]}
            current={editor.step}
            style={{ marginBottom: 16 }}
          />

          {editor.step === 0 ? (
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
                                  new Error(t("products.form.title.required"))
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
                label={t("products.form.tags")}
                name="tags">
                <Select
                  mode="tags"
                  placeholder={t("products.form.tags.placeholder")}
                />
              </Form.Item>
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
                                "products.form.attr.key.placeholder"
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
                                "products.form.attr.value.placeholder"
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
                          />
                        ))}
                      </Space>
                      <ImageUploader
                        value={null}
                        onChange={(nu) => {
                          if (nu) form.setFieldValue("images", [...imgs, nu]);
                        }}
                        folder="products"
                      />
                    </Space>
                  );
                }}
              </Form.Item>
              <Form.Item
                label={t("products.form.isActive")}
                name="isActive"
                valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
          ) : (
            <Space
              direction="vertical"
              style={{ width: "100%" }}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title
                  level={4}
                  style={{ margin: 0 }}>
                  {t("products.steps.variants")}
                </Typography.Title>
                <Button onClick={onAddVariant}>
                  {t("products.variants.add")}
                </Button>
              </Space>

              <Form
                layout="vertical"
                form={variantForm}>
                <Space wrap>
                  <Form.Item
                    label={t("products.variants.form.sku")}
                    name="sku"
                    rules={[
                      {
                        required: true,
                        message: t("products.variants.form.sku.required"),
                      },
                    ]}>
                    <Input style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.manufacturer")}
                    name="manufacturerId"
                    rules={[
                      {
                        required: true,
                        message: t(
                          "products.variants.form.manufacturer.required"
                        ),
                      },
                    ]}>
                    <Select
                      style={{ width: 240 }}
                      options={manufacturers.map((m) => ({
                        value: m._id,
                        label: m.name,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.country")}
                    name="countryId">
                    <Select
                      allowClear
                      style={{ width: 220 }}
                      options={countries.map((c) => ({
                        value: c._id,
                        label: c.name,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.price")}
                    name="price"
                    rules={[
                      {
                        required: true,
                        message: t("products.variants.form.price.required"),
                      },
                    ]}>
                    <InputNumber
                      min={0}
                      style={{ width: 140 }}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.unit")}
                    name="unit">
                    <Input
                      style={{ width: 120 }}
                      placeholder={t("products.variants.form.unit.placeholder")}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.barcode")}
                    name="barcode">
                    <Input style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item
                    label={t("products.variants.form.isActive")}
                    name="isActive"
                    valuePropName="checked"
                    initialValue={true}>
                    <Switch />
                  </Form.Item>
                </Space>
                <Form.Item
                  label={t("products.variants.form.options")}
                  tooltip={t("products.variants.form.options.tooltip")}>
                  <Input.TextArea
                    rows={2}
                    placeholder={t(
                      "products.variants.form.options.placeholder"
                    )}
                    onBlur={(e) => {
                      const text = e.target.value || "";
                      const pairs = text
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const obj: Record<string, string | number> = {};
                      for (const p of pairs) {
                        const [k, ...rest] = p.split(":");
                        const v = rest.join(":").trim();
                        if (!k) continue;
                        const maybeNum = Number(v);
                        obj[k.trim()] = isNaN(maybeNum) ? v : maybeNum;
                      }
                      variantForm.setFieldValue("options", obj);
                    }}
                  />
                </Form.Item>
                <Space>
                  <Button
                    onClick={onApplyVariant}
                    type="primary">
                    {t("products.variants.form.apply")}
                  </Button>
                </Space>
              </Form>

              <Table
                rowKey={(r) => r._id || r._tmpId || r.sku}
                columns={variantColumns}
                dataSource={variants}
                pagination={false}
              />
            </Space>
          )}
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
                        : t("products.bulk.success.remove")
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
      </Space>
    </AdminLayout>
  );
}
