import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  theme as antdTheme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useQueryParam } from "../hooks/useQueryParam";
import {
  createDiscount,
  deleteDiscount,
  listDiscounts,
  type Discount,
  type ListDiscountsResponse,
  updateDiscount,
  addDiscountTargets,
  removeDiscountTargets,
  getDiscount,
  type TargetGroup,
} from "../api/discounts";
import { listCategories, type Category } from "../api/categories";
import { listManufacturers, type Manufacturer } from "../api/manufacturers";
import { listCountries, type Country } from "../api/countries";
import { useI18n } from "../store/i18n";

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  record?: Discount | null;
};

type TargetsState = {
  open: boolean;
  record?: Discount | null;
  productIdsText: string;
  categoryIds: string[];
  manufacturerIds: string[];
  countryIds: string[];
};

export function DiscountsPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [q, setQ] = useQueryParam("q", "");
  const [isActiveStr, setIsActiveStr] = useQueryParam("isActive", "");
  const [sort, setSort] = useQueryParam("sort", "-createdAt");
  const [pageStr, setPageStr] = useQueryParam("page", "1");
  const [limitStr, setLimitStr] = useQueryParam("limit", "20");
  const page = Math.max(1, parseInt(pageStr || "1") || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitStr || "20") || 20));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListDiscountsResponse | null>(null);
  const items = data?.items || [];

  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const [form] = Form.useForm<{
    name: string;
    description?: string;
    type: "percent" | "fixed";
    value: number;
    isActive: boolean;
    startsAt?: string;
    endsAt?: string;
    priority?: number;
    stackable?: boolean;
    productIds?: string[];
    categoryIds?: string[];
    manufacturerIds?: string[];
    countryIds?: string[];
    tags?: string[];
    targetGroups?: Array<{
      productIdsText?: string; // for UI input only
      productIds?: string[]; // normalized
      categoryIds?: string[];
      manufacturerIds?: string[];
      countryIds?: string[];
      tags?: string[];
    }>;
  }>();

  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: "create",
    record: null,
  });

  const [targets, setTargets] = useState<TargetsState>({
    open: false,
    record: null,
    productIdsText: "",
    categoryIds: [],
    manufacturerIds: [],
    countryIds: [],
  });

  const [current, setCurrent] = useState<Discount | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);

  const loadRefs = useCallback(async () => {
    try {
      const [cats, mans, cnts] = await Promise.all([
        listCategories(),
        listManufacturers(),
        listCountries(),
      ]);
      setCategories(cats);
      setManufacturers(mans);
      setCountries(cnts);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDiscounts({
        q: q || undefined,
        isActive: isActiveStr ? isActiveStr === "true" : undefined,
        sort: sort || undefined,
        page,
        limit,
      });
      setData(res);
    } catch {
      message.error(t("discounts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [q, isActiveStr, sort, page, limit, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editor.open) void loadRefs();
  }, [editor.open, loadRefs]);

  useEffect(() => {
    const run = async () => {
      if (targets.open && targets.record) {
        try {
          setTargetsLoading(true);
          // Ensure reference lists available for name mapping
          await loadRefs();
          const fresh = await getDiscount(targets.record._id);
          setCurrent(fresh);
        } catch {
          // ignore
        } finally {
          setTargetsLoading(false);
        }
      } else {
        setCurrent(null);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.open, targets.record?._id]);

  const onTagFilter = useCallback(
    (t: string) => {
      setQ(t);
      setPageStr("1");
    },
    [setQ, setPageStr]
  );

  const onEdit = useCallback(
    (r: Discount) => {
      setEditor({ open: true, mode: "edit", record: r });
      form.setFieldsValue({
        name: r.name,
        description: r.description || "",
        type: r.type,
        value: r.value,
        isActive: r.isActive,
        startsAt: r.startsAt || undefined,
        endsAt: r.endsAt || undefined,
        priority: r.priority ?? 0,
        stackable: r.stackable ?? false,
        productIds: r.productIds || [],
        categoryIds: r.categoryIds || [],
        manufacturerIds: r.manufacturerIds || [],
        countryIds: r.countryIds || [],
        tags: r.tags || [],
        targetGroups: r.targetGroups?.length
          ? r.targetGroups.map((g: TargetGroup) => ({
              productIdsText: Array.isArray(g.productIds)
                ? g.productIds.join(", ")
                : "",
              categoryIds: g.categoryIds || [],
              manufacturerIds: g.manufacturerIds || [],
              countryIds: g.countryIds || [],
              tags: g.tags || [],
            }))
          : [],
      });
    },
    [form]
  );

  const onDelete = useCallback(
    (r: Discount) => {
      modal.confirm({
        title: t("discounts.delete.title"),
        content: `${t("discounts.delete.confirm")} «${r.name}»?`,
        okText: t("common.delete"),
        okButtonProps: { danger: true },
        async onOk() {
          try {
            await deleteDiscount(r._id);
            message.success(t("discounts.delete.success"));
            await load();
          } catch {
            message.error(t("discounts.delete.error"));
          }
        },
      });
    },
    [modal, t, message, load]
  );

  const columns: ColumnsType<Discount> = useMemo(
    () => [
      { title: t("discounts.columns.name"), dataIndex: "name", key: "name" },
      {
        title: t("discounts.columns.type"),
        dataIndex: "type",
        key: "type",
        width: 120,
        render: (v: Discount["type"]) =>
          v === "percent" ? "%" : t("discounts.type.fixed"),
      },
      {
        title: t("discounts.columns.value"),
        dataIndex: "value",
        key: "value",
        width: 120,
      },
      {
        title: t("discounts.columns.scope"),
        key: "scope",
        render: (_: unknown, r) => {
          const bits: string[] = [];
          if (r.productIds && r.productIds.length)
            bits.push(
              `${t("discounts.scope.products")}:${r.productIds.length}`
            );
          if (r.categoryIds && r.categoryIds.length)
            bits.push(
              `${t("discounts.scope.categories")}:${r.categoryIds.length}`
            );
          if (r.manufacturerIds && r.manufacturerIds.length)
            bits.push(
              `${t("discounts.scope.manufacturers")}:${r.manufacturerIds.length}`
            );
          if (r.countryIds && r.countryIds.length)
            bits.push(
              `${t("discounts.scope.countries")}:${r.countryIds.length}`
            );
          return bits.length ? (
            <Space
              size={4}
              wrap>
              {r.productIds && r.productIds.length ? (
                <Tag color="processing">
                  {t("discounts.scope.products")}: {r.productIds.length}
                </Tag>
              ) : null}
              {r.categoryIds && r.categoryIds.length ? (
                <Tag color="success">
                  {t("discounts.scope.categories")}: {r.categoryIds.length}
                </Tag>
              ) : null}
              {r.manufacturerIds && r.manufacturerIds.length ? (
                <Tag color="warning">
                  {t("discounts.scope.manufacturers")}:{" "}
                  {r.manufacturerIds.length}
                </Tag>
              ) : null}
              {r.countryIds && r.countryIds.length ? (
                <Tag>
                  {t("discounts.scope.countries")}: {r.countryIds.length}
                </Tag>
              ) : null}
            </Space>
          ) : (
            <Tag>{t("discounts.scope.all")}</Tag>
          );
        },
      },
      {
        title: t("discounts.columns.tags"),
        dataIndex: "tags",
        key: "tags",
        render: (tags?: string[]) =>
          tags && tags.length ? (
            <Space
              size={4}
              wrap>
              {tags.map((t) => (
                <Tag
                  key={t}
                  color="blue"
                  style={{ cursor: "pointer" }}
                  onClick={() => onTagFilter(t)}>
                  {t}
                </Tag>
              ))}
            </Space>
          ) : (
            "—"
          ),
      },
      {
        title: t("discounts.columns.isActive"),
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
        title: t("discounts.columns.period"),
        key: "period",
        render: (_: unknown, r) => {
          const now = dayjs();
          const start = r.startsAt ? dayjs(r.startsAt) : null;
          const end = r.endsAt ? dayjs(r.endsAt) : null;
          let status: "not-started" | "active" | "expired" = "active";
          if (start && now.isBefore(start)) status = "not-started";
          else if (end && now.isAfter(end)) status = "expired";
          const s = start ? start.format("YYYY-MM-DD") : "—";
          const e = end ? end.format("YYYY-MM-DD") : "—";
          const label =
            status === "not-started"
              ? t("discounts.period.notStarted")
              : status === "expired"
                ? t("discounts.period.expired")
                : t("discounts.period.activeNow");
          const color =
            status === "not-started"
              ? undefined
              : status === "expired"
                ? "error"
                : "success";
          return (
            <Space
              direction="vertical"
              size={0}>
              <Tag color={color}>{label}</Tag>
              <span
                style={{
                  color: token.colorTextSecondary,
                }}>{`${s} → ${e}`}</span>
            </Space>
          );
        },
      },
      {
        title: t("discounts.columns.stackable"),
        key: "stackable",
        width: 140,
        render: (_: unknown, r) =>
          r.stackable ? (
            <Tag color="warning">{t("discounts.stackable")}</Tag>
          ) : (
            "—"
          ),
      },
      {
        title: t("discounts.columns.priority"),
        dataIndex: "priority",
        key: "priority",
        width: 120,
        render: (v?: number) => v ?? 0,
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
              onClick={() => {
                setTargets({
                  open: true,
                  record: r,
                  productIdsText: "",
                  categoryIds: [],
                  manufacturerIds: [],
                  countryIds: [],
                });
              }}>
              {t("discounts.actions.targets")}
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
    [onTagFilter, token, t, onEdit, onDelete]
  );

  const onCreate = () => {
    setEditor({ open: true, mode: "create", record: null });
    form.setFieldsValue({
      name: "",
      description: "",
      type: "percent",
      value: 0,
      isActive: true,
      priority: 0,
      stackable: false,
      productIds: [],
      categoryIds: [],
      manufacturerIds: [],
      countryIds: [],
      tags: [],
      targetGroups: [],
    });
  };

  const onSave = async () => {
    const values = await form.validateFields();
    // Normalize target groups: parse productIdsText into array, drop empty groups
    const normalizedGroups = (values.targetGroups || [])
      .map((g) => {
        const productIds = (g.productIdsText || "")
          .split(/\s|,|\n|\r/g)
          .map((s) => s.trim())
          .filter(Boolean);
        const group = {
          productIds: productIds.length ? productIds : undefined,
          categoryIds:
            g.categoryIds && g.categoryIds.length ? g.categoryIds : undefined,
          manufacturerIds:
            g.manufacturerIds && g.manufacturerIds.length
              ? g.manufacturerIds
              : undefined,
          countryIds:
            g.countryIds && g.countryIds.length ? g.countryIds : undefined,
          tags: g.tags && g.tags.length ? g.tags : undefined,
        };
        const hasAny = Object.values(group).some((v) =>
          Array.isArray(v) ? v.length > 0 : false
        );
        return hasAny ? group : null;
      })
      .filter((g) => g !== null) as Array<{
      productIds?: string[];
      categoryIds?: string[];
      manufacturerIds?: string[];
      countryIds?: string[];
      tags?: string[];
    }>;
    try {
      if (editor.mode === "create") {
        await createDiscount({
          name: values.name,
          description: values.description || undefined,
          type: values.type,
          value: values.value,
          isActive: values.isActive,
          startsAt: values.startsAt
            ? dayjs(values.startsAt).toISOString()
            : undefined,
          endsAt: values.endsAt
            ? dayjs(values.endsAt).toISOString()
            : undefined,
          priority: values.priority,
          stackable: values.stackable,
          productIds: values.productIds || [],
          categoryIds: values.categoryIds || [],
          manufacturerIds: values.manufacturerIds || [],
          countryIds: values.countryIds || [],
          tags: values.tags || [],
          targetGroups: normalizedGroups.length ? normalizedGroups : undefined,
        });
        message.success(t("discounts.save.created"));
      } else if (editor.mode === "edit" && editor.record) {
        await updateDiscount(editor.record._id, {
          name: values.name,
          description: values.description || undefined,
          type: values.type,
          value: values.value,
          isActive: values.isActive,
          startsAt: values.startsAt
            ? dayjs(values.startsAt).toISOString()
            : undefined,
          endsAt: values.endsAt
            ? dayjs(values.endsAt).toISOString()
            : undefined,
          priority: values.priority,
          stackable: values.stackable,
          productIds: values.productIds || [],
          categoryIds: values.categoryIds || [],
          manufacturerIds: values.manufacturerIds || [],
          countryIds: values.countryIds || [],
          tags: values.tags || [],
          targetGroups: normalizedGroups.length ? normalizedGroups : [],
        });
        message.success(t("discounts.save.updated"));
      }
      setEditor({ open: false, mode: "create", record: null });
      await load();
    } catch {
      message.error(t("discounts.save.error"));
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
            placeholder={t("common.search")}
            style={{ width: 220 }}
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
            placeholder={t("discounts.filters.active.placeholder")}
            style={{ width: 160 }}
            value={isActiveStr || undefined}
            onChange={(v) => {
              setIsActiveStr(v ?? "");
              setPageStr("1");
            }}
            options={[
              { value: "true", label: t("discounts.filters.active.true") },
              { value: "false", label: t("discounts.filters.active.false") },
            ]}
          />
          <Select
            placeholder={t("discounts.filters.sort.placeholder")}
            style={{ width: 220 }}
            value={sort || undefined}
            onChange={(v) => {
              setSort(v ?? "");
              setPageStr("1");
            }}
            options={[
              {
                value: "-createdAt",
                label: t("discounts.filters.sort.newFirst"),
              },
              {
                value: "createdAt",
                label: t("discounts.filters.sort.oldFirst"),
              },
              {
                value: "-priority,createdAt",
                label: t("discounts.filters.sort.priorityDescNew"),
              },
              {
                value: "priority,createdAt",
                label: t("discounts.filters.sort.priorityAscNew"),
              },
            ]}
            allowClear
          />
          <Button
            type="primary"
            onClick={() => onCreate()}>
            {t("common.create")}
          </Button>
        </Space>

        <Table
          rowKey="_id"
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

        <Drawer
          open={editor.open}
          width={900}
          onClose={() =>
            setEditor({ open: false, mode: "create", record: null })
          }
          title={
            editor.mode === "create"
              ? t("discounts.editor.createTitle")
              : t("discounts.editor.editTitle")
          }
          extra={
            <Space>
              <Button
                type="primary"
                onClick={onSave}>
                {t("common.save")}
              </Button>
            </Space>
          }>
          <Form
            layout="vertical"
            form={form}
            initialValues={{ isActive: true, priority: 0, stackable: false }}>
            <Form.Item
              label={t("discounts.form.name")}
              name="name"
              rules={[
                { required: true, message: t("discounts.form.name.required") },
              ]}>
              <Input />
            </Form.Item>
            <Form.Item
              label={t("discounts.form.description")}
              name="description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Space wrap>
              <Form.Item
                label={t("discounts.form.type")}
                name="type"
                rules={[{ required: true }]}>
                <Select
                  style={{ width: 180 }}
                  options={[
                    { value: "percent", label: "%" },
                    { value: "fixed", label: t("discounts.type.fixed.short") },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label={t("discounts.form.value")}
                name="value"
                rules={[{ required: true }]}>
                <InputNumber
                  min={0}
                  style={{ width: 160 }}
                />
              </Form.Item>
              <Form.Item
                label={t("discounts.form.isActive")}
                name="isActive"
                valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                label={t("discounts.form.priority")}
                name="priority">
                <InputNumber style={{ width: 160 }} />
              </Form.Item>
              <Form.Item
                label={t("discounts.form.stackable")}
                name="stackable"
                valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>
            <Space wrap>
              <Form.Item
                label={t("discounts.form.startsAt")}
                name="startsAt">
                <DatePicker
                  style={{ width: 200 }}
                  allowClear
                />
              </Form.Item>
              <Form.Item
                label={t("discounts.form.endsAt")}
                name="endsAt">
                <DatePicker
                  style={{ width: 200 }}
                  allowClear
                />
              </Form.Item>
            </Space>
            <Form.Item
              label={t("discounts.form.categories")}
              name="categoryIds">
              <Select
                mode="multiple"
                placeholder={t("discounts.form.categories.placeholder")}
                options={categories.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              label={t("discounts.form.manufacturers")}
              name="manufacturerIds">
              <Select
                mode="multiple"
                placeholder={t("discounts.form.manufacturers.placeholder")}
                options={manufacturers.map((m) => ({
                  value: m._id,
                  label: m.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              label={t("discounts.form.countries")}
              name="countryIds">
              <Select
                mode="multiple"
                placeholder={t("discounts.form.countries.placeholder")}
                options={countries.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              label={t("discounts.form.tags")}
              name="tags">
              <Select
                mode="tags"
                placeholder={t("discounts.form.tags.placeholder")}
              />
            </Form.Item>
            {/* Target Groups Builder */}
            <div style={{ fontWeight: 600 }}>
              {t("discounts.form.targetGroups")}
            </div>
            <div style={{ color: token.colorTextSecondary, marginBottom: 8 }}>
              {t("discounts.form.targetGroups.help")}
            </div>
            <Form.List name="targetGroups">
              {(fields, { add, remove }) => (
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}>
                  {fields.map(({ key, name }) => (
                    <div
                      key={key}
                      style={{
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: 8,
                        padding: 12,
                      }}>
                      <Space
                        align="start"
                        style={{ width: "100%" }}
                        wrap>
                        <Form.Item
                          label={t("discounts.form.group.products")}
                          name={[name, "productIdsText"]}
                          style={{ minWidth: 260 }}>
                          <Input.TextArea
                            rows={2}
                            placeholder={t(
                              "discounts.form.group.products.placeholder"
                            )}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("discounts.form.group.categories")}
                          name={[name, "categoryIds"]}>
                          <Select
                            mode="multiple"
                            placeholder={t(
                              "discounts.form.categories.placeholder"
                            )}
                            options={categories.map((c) => ({
                              value: c._id,
                              label: c.name,
                            }))}
                            style={{ minWidth: 240 }}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("discounts.form.group.manufacturers")}
                          name={[name, "manufacturerIds"]}>
                          <Select
                            mode="multiple"
                            placeholder={t(
                              "discounts.form.manufacturers.placeholder"
                            )}
                            options={manufacturers.map((m) => ({
                              value: m._id,
                              label: m.name,
                            }))}
                            style={{ minWidth: 240 }}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("discounts.form.group.countries")}
                          name={[name, "countryIds"]}>
                          <Select
                            mode="multiple"
                            placeholder={t(
                              "discounts.form.countries.placeholder"
                            )}
                            options={countries.map((c) => ({
                              value: c._id,
                              label: c.name,
                            }))}
                            style={{ minWidth: 220 }}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("discounts.form.group.tags")}
                          name={[name, "tags"]}>
                          <Select
                            mode="tags"
                            placeholder={t(
                              "discounts.form.group.tags.placeholder"
                            )}
                            style={{ minWidth: 220 }}
                          />
                        </Form.Item>
                        <div style={{ flex: 1 }} />
                        <Button
                          danger
                          onClick={() => remove(name)}>
                          {t("discounts.form.targetGroups.remove")}
                        </Button>
                      </Space>
                    </div>
                  ))}
                  <Button onClick={() => add()}>
                    {t("discounts.form.targetGroups.add")}
                  </Button>
                </Space>
              )}
            </Form.List>
            <div style={{ color: token.colorTextSecondary }}>
              {t("discounts.form.groups.note")}
            </div>
          </Form>
        </Drawer>

        {/* Manage Targets Drawer */}
        <Drawer
          open={targets.open}
          width={720}
          onClose={() =>
            setTargets({
              open: false,
              record: null,
              productIdsText: "",
              categoryIds: [],
              manufacturerIds: [],
              countryIds: [],
            })
          }
          title={
            targets.record
              ? `${t("discounts.targets.title")}: ${targets.record.name}`
              : t("discounts.targets.title")
          }
          extra={
            <Space>
              <Button
                onClick={async () => {
                  if (!targets.record) return;
                  const productIds = targets.productIdsText
                    .split(/\s|,|\n|\r/g)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  try {
                    await addDiscountTargets(targets.record._id, {
                      productIds: productIds.length ? productIds : undefined,
                      categoryIds: targets.categoryIds.length
                        ? targets.categoryIds
                        : undefined,
                      manufacturerIds: targets.manufacturerIds.length
                        ? targets.manufacturerIds
                        : undefined,
                      countryIds: targets.countryIds.length
                        ? targets.countryIds
                        : undefined,
                    });
                    message.success(t("discounts.targets.added"));
                    await load();
                    // keep drawer open; refresh preview
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(t("discounts.targets.addError"));
                  }
                }}
                type="primary">
                {t("common.add")}
              </Button>
              <Button
                danger
                onClick={async () => {
                  if (!targets.record) return;
                  const productIds = targets.productIdsText
                    .split(/\s|,|\n|\r/g)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  try {
                    await removeDiscountTargets(targets.record._id, {
                      productIds: productIds.length ? productIds : undefined,
                      categoryIds: targets.categoryIds.length
                        ? targets.categoryIds
                        : undefined,
                      manufacturerIds: targets.manufacturerIds.length
                        ? targets.manufacturerIds
                        : undefined,
                      countryIds: targets.countryIds.length
                        ? targets.countryIds
                        : undefined,
                    });
                    message.success(t("discounts.targets.removed"));
                    await load();
                    // keep drawer open; refresh preview
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(t("discounts.targets.removeError"));
                  }
                }}>
                {t("common.delete")}
              </Button>
            </Space>
          }>
          <Space
            direction="vertical"
            style={{ width: "100%" }}>
            <div style={{ fontWeight: 600 }}>
              {t("discounts.targets.current")}
            </div>
            <Space wrap>
              <Tag>
                {t("discounts.scope.products")}:{" "}
                {current?.productIds?.length ?? 0}
              </Tag>
              <Tag>
                {t("discounts.scope.categories")}:{" "}
                {current?.categoryIds?.length ?? 0}
              </Tag>
              <Tag>
                {t("discounts.scope.manufacturers")}:{" "}
                {current?.manufacturerIds?.length ?? 0}
              </Tag>
              <Tag>
                {t("discounts.scope.countries")}:{" "}
                {current?.countryIds?.length ?? 0}
              </Tag>
            </Space>
            <Space wrap>
              <Button
                size="small"
                disabled={!current?.productIds?.length}
                loading={targetsLoading}
                onClick={async () => {
                  if (!targets.record || !current?.productIds?.length) return;
                  try {
                    await removeDiscountTargets(targets.record._id, {
                      productIds: current.productIds,
                    });
                    message.success(t("discounts.targets.cleared.products"));
                    await load();
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(t("discounts.targets.clearError.products"));
                  }
                }}>
                {t("discounts.targets.clear.products")}
              </Button>
              <Button
                size="small"
                disabled={!current?.categoryIds?.length}
                loading={targetsLoading}
                onClick={async () => {
                  if (!targets.record || !current?.categoryIds?.length) return;
                  try {
                    await removeDiscountTargets(targets.record._id, {
                      categoryIds: current.categoryIds,
                    });
                    message.success(t("discounts.targets.cleared.categories"));
                    await load();
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(t("discounts.targets.clearError.categories"));
                  }
                }}>
                {t("discounts.targets.clear.categories")}
              </Button>
              <Button
                size="small"
                disabled={!current?.manufacturerIds?.length}
                loading={targetsLoading}
                onClick={async () => {
                  if (!targets.record || !current?.manufacturerIds?.length)
                    return;
                  try {
                    await removeDiscountTargets(targets.record._id, {
                      manufacturerIds: current.manufacturerIds,
                    });
                    message.success(
                      t("discounts.targets.cleared.manufacturers")
                    );
                    await load();
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(
                      t("discounts.targets.clearError.manufacturers")
                    );
                  }
                }}>
                {t("discounts.targets.clear.manufacturers")}
              </Button>
              <Button
                size="small"
                disabled={!current?.countryIds?.length}
                loading={targetsLoading}
                onClick={async () => {
                  if (!targets.record || !current?.countryIds?.length) return;
                  try {
                    await removeDiscountTargets(targets.record._id, {
                      countryIds: current.countryIds,
                    });
                    message.success(t("discounts.targets.cleared.countries"));
                    await load();
                    const fresh = await getDiscount(targets.record._id);
                    setCurrent(fresh);
                  } catch {
                    message.error(t("discounts.targets.clearError.countries"));
                  }
                }}>
                {t("discounts.targets.clear.countries")}
              </Button>
            </Space>
            <div style={{ height: 8 }} />
            <Input.TextArea
              rows={4}
              placeholder={t("discounts.targets.input.placeholder")}
              value={targets.productIdsText}
              onChange={(e) =>
                setTargets((t) => ({ ...t, productIdsText: e.target.value }))
              }
            />
            <Form layout="vertical">
              <Form.Item label={t("discounts.form.categories")}>
                <Select
                  mode="multiple"
                  placeholder={t("discounts.form.categories.placeholder")}
                  options={categories.map((c) => ({
                    value: c._id,
                    label: c.name,
                  }))}
                  value={targets.categoryIds}
                  onChange={(vals) =>
                    setTargets((t) => ({ ...t, categoryIds: vals }))
                  }
                />
              </Form.Item>
              <Form.Item label={t("discounts.form.manufacturers")}>
                <Select
                  mode="multiple"
                  placeholder={t("discounts.form.manufacturers.placeholder")}
                  options={manufacturers.map((m) => ({
                    value: m._id,
                    label: m.name,
                  }))}
                  value={targets.manufacturerIds}
                  onChange={(vals) =>
                    setTargets((t) => ({ ...t, manufacturerIds: vals }))
                  }
                />
              </Form.Item>
              <Form.Item label={t("discounts.form.countries")}>
                <Select
                  mode="multiple"
                  placeholder={t("discounts.form.countries.placeholder")}
                  options={countries.map((c) => ({
                    value: c._id,
                    label: c.name,
                  }))}
                  value={targets.countryIds}
                  onChange={(vals) =>
                    setTargets((t) => ({ ...t, countryIds: vals }))
                  }
                />
              </Form.Item>
            </Form>
            <div style={{ color: token.colorTextSecondary }}>
              {t("discounts.targets.hint")}
            </div>
          </Space>
        </Drawer>
      </Space>
    </AdminLayout>
  );
}
