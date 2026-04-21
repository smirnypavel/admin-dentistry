import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeStats,
  type PromoCode,
  type ListPromoCodesResponse,
  type PromoCodeStats,
} from "../api/promo-codes";
import { listCategories, type Category } from "../api/categories";
import { listProducts, type Product } from "../api/products";
import { listSubcategories, type Subcategory } from "../api/subcategories";
import { useI18n } from "../store/i18n";

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  record?: PromoCode | null;
};

export function PromoCodesTab() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListPromoCodesResponse | null>(null);
  const items = data?.items || [];

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [form] = Form.useForm<{
    code: string;
    name: string;
    description?: string;
    type: "percent" | "fixed";
    value: number;
    isActive: boolean;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    allowedProductIds?: string[];
    allowedCategoryIds?: string[];
    allowedSubcategoryIds?: string[];
    excludedProductIds?: string[];
    excludedCategoryIds?: string[];
    excludedSubcategoryIds?: string[];
  }>();

  const [editor, setEditor] = useState<EditorState>({
    open: false,
    mode: "create",
    record: null,
  });

  const [statsModal, setStatsModal] = useState<{
    open: boolean;
    data: PromoCodeStats | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
      }),
    [],
  );

  const loadRefs = useCallback(async () => {
    try {
      const [cats, subcats, prods] = await Promise.all([
        listCategories(),
        listSubcategories(),
        listProducts({ limit: 500 }),
      ]);
      setCategories(cats);
      setSubcategories(subcats);
      setProducts(prods.items || []);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPromoCodes({
        q: q || undefined,
        isActive,
        sort: "-createdAt",
        page,
        limit,
      });
      setData(res);
    } catch {
      message.error(t("promoCodes.loadError"));
    } finally {
      setLoading(false);
    }
  }, [q, isActive, page, limit, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (editor.open) void loadRefs();
  }, [editor.open, loadRefs]);

  const onCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      type: "percent",
      value: 0,
      isActive: true,
    });
    setEditor({ open: true, mode: "create", record: null });
  };

  const onEdit = (r: PromoCode) => {
    form.setFieldsValue({
      code: r.code,
      name: r.name,
      description: r.description || "",
      type: r.type,
      value: r.value,
      isActive: r.isActive,
      usageLimit: r.usageLimit ?? undefined,
      startsAt: r.startsAt || null,
      endsAt: r.endsAt || null,
      allowedProductIds: r.allowedProductIds || [],
      allowedCategoryIds: r.allowedCategoryIds || [],
      allowedSubcategoryIds: r.allowedSubcategoryIds || [],
      excludedProductIds: r.excludedProductIds || [],
      excludedCategoryIds: r.excludedCategoryIds || [],
      excludedSubcategoryIds: r.excludedSubcategoryIds || [],
    });
    setEditor({ open: true, mode: "edit", record: r });
  };

  const onDelete = (r: PromoCode) => {
    modal.confirm({
      title: t("promoCodes.delete.title"),
      content: `${t("promoCodes.delete.confirm")} «${r.code}»?`,
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deletePromoCode(r._id);
          message.success(t("promoCodes.delete.success"));
          void load();
        } catch {
          message.error(t("promoCodes.delete.error"));
        }
      },
    });
  };

  const onShowStats = async (r: PromoCode) => {
    setStatsModal({ open: true, data: null, loading: true });
    try {
      const stats = await getPromoCodeStats(r._id);
      setStatsModal({ open: true, data: stats, loading: false });
    } catch {
      message.error(t("promoCodes.stats.loadError"));
      setStatsModal({ open: false, data: null, loading: false });
    }
  };

  const onSave = async () => {
    try {
      const vals = await form.validateFields();
      const dto = {
        code: vals.code,
        name: vals.name,
        description: vals.description || undefined,
        type: vals.type,
        value: vals.value,
        isActive: vals.isActive,
        usageLimit:
          vals.usageLimit != null && vals.usageLimit > 0
            ? vals.usageLimit
            : null,
        startsAt: vals.startsAt || undefined,
        endsAt: vals.endsAt || undefined,
        allowedProductIds: vals.allowedProductIds || [],
        allowedCategoryIds: vals.allowedCategoryIds || [],
        allowedSubcategoryIds: vals.allowedSubcategoryIds || [],
        excludedProductIds: vals.excludedProductIds || [],
        excludedCategoryIds: vals.excludedCategoryIds || [],
        excludedSubcategoryIds: vals.excludedSubcategoryIds || [],
      };
      if (editor.mode === "create") {
        await createPromoCode(dto);
        message.success(t("promoCodes.save.created"));
      } else if (editor.record) {
        await updatePromoCode(editor.record._id, dto);
        message.success(t("promoCodes.save.updated"));
      }
      setEditor({ open: false, mode: "create", record: null });
      void load();
    } catch {
      message.error(t("promoCodes.save.error"));
    }
  };

  const columns: ColumnsType<PromoCode> = [
    {
      title: t("promoCodes.columns.code"),
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (code: string) => (
        <Typography.Text
          copyable
          strong>
          {code}
        </Typography.Text>
      ),
    },
    {
      title: t("promoCodes.columns.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("promoCodes.columns.type"),
      key: "type",
      width: 120,
      render: (_: unknown, r: PromoCode) =>
        r.type === "percent" ? `${r.value}%` : fmt.format(r.value),
    },
    {
      title: t("promoCodes.columns.usage"),
      key: "usage",
      width: 140,
      render: (_: unknown, r: PromoCode) => (
        <span>
          {r.usageCount}
          {r.usageLimit != null ? ` / ${r.usageLimit}` : ` / ∞`}
        </span>
      ),
    },
    {
      title: t("promoCodes.columns.period"),
      key: "period",
      width: 200,
      render: (_: unknown, r: PromoCode) => {
        const from = r.startsAt ? dayjs(r.startsAt).format("DD.MM.YY") : "—";
        const to = r.endsAt ? dayjs(r.endsAt).format("DD.MM.YY") : "∞";
        return `${from} → ${to}`;
      },
    },
    {
      title: t("promoCodes.columns.active"),
      dataIndex: "isActive",
      key: "isActive",
      width: 80,
      render: (v: boolean, r: PromoCode) => (
        <Switch
          size="small"
          checked={v}
          onChange={async (checked) => {
            try {
              await updatePromoCode(r._id, { isActive: checked });
              void load();
            } catch {
              message.error(t("promoCodes.save.error"));
            }
          }}
        />
      ),
    },
    {
      title: t("promoCodes.columns.actions"),
      key: "actions",
      width: 220,
      render: (_: unknown, r: PromoCode) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => onShowStats(r)}>
            {t("promoCodes.actions.stats")}
          </Button>
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
  ];

  return (
    <Space
      direction="vertical"
      style={{ width: "100%" }}
      size="middle">
      <Space wrap>
        <Input.Search
          allowClear
          placeholder={t("promoCodes.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={() => {
            setPage(1);
            void load();
          }}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder={t("promoCodes.filter.active")}
          style={{ width: 160 }}
          value={isActive}
          onChange={(v) => {
            setIsActive(v);
            setPage(1);
          }}
          options={[
            { value: true, label: t("common.yes") },
            { value: false, label: t("common.no") },
          ]}
        />
        <Button
          type="primary"
          onClick={onCreate}>
          {t("promoCodes.add")}
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
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
        scroll={{ x: 900 }}
      />

      {/* Editor Drawer */}
      <Drawer
        title={
          editor.mode === "create"
            ? t("promoCodes.editor.createTitle")
            : t("promoCodes.editor.editTitle")
        }
        width={520}
        open={editor.open}
        onClose={() => setEditor({ open: false, mode: "create", record: null })}
        extra={
          <Button
            type="primary"
            onClick={onSave}>
            {t("common.save")}
          </Button>
        }>
        <Form
          form={form}
          layout="vertical">
          <Form.Item
            name="code"
            label={t("promoCodes.form.code")}
            rules={[
              { required: true, message: t("promoCodes.form.code.required") },
            ]}>
            <Input
              placeholder="OLEG10"
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={t("promoCodes.form.name")}
            rules={[
              { required: true, message: t("promoCodes.form.name.required") },
            ]}>
            <Input placeholder={t("promoCodes.form.name.placeholder")} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("promoCodes.form.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="middle">
            <Form.Item
              name="type"
              label={t("promoCodes.form.type")}
              rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: "percent", label: t("discounts.type.percent") },
                  { value: "fixed", label: t("discounts.type.fixed") },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="value"
              label={t("promoCodes.form.value")}
              rules={[{ required: true }]}>
              <InputNumber
                min={0}
                style={{ width: 120 }}
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="usageLimit"
            label={t("promoCodes.form.usageLimit")}>
            <InputNumber
              min={0}
              placeholder={t("promoCodes.form.usageLimit.placeholder")}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Space size="middle">
            <Form.Item
              name="startsAt"
              label={t("promoCodes.form.startsAt")}>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                value={
                  form.getFieldValue("startsAt")
                    ? dayjs(form.getFieldValue("startsAt"))
                    : undefined
                }
                onChange={(d) =>
                  form.setFieldValue("startsAt", d?.toISOString() || null)
                }
              />
            </Form.Item>
            <Form.Item
              name="endsAt"
              label={t("promoCodes.form.endsAt")}>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                value={
                  form.getFieldValue("endsAt")
                    ? dayjs(form.getFieldValue("endsAt"))
                    : undefined
                }
                onChange={(d) =>
                  form.setFieldValue("endsAt", d?.toISOString() || null)
                }
              />
            </Form.Item>
          </Space>
          <Form.Item
            name="isActive"
            label={t("promoCodes.form.isActive")}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Typography.Title level={5}>
            {t("promoCodes.form.targeting")}
          </Typography.Title>

          <Form.Item
            name="allowedCategoryIds"
            label={t("promoCodes.form.allowedCategories")}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t("promoCodes.form.allowedCategories.placeholder")}
              options={categories.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="allowedSubcategoryIds"
            label={t("promoCodes.form.allowedSubcategories")}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t("promoCodes.form.allowedSubcategories.placeholder")}
              options={subcategories.map((s) => ({
                value: s._id,
                label: s.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="allowedProductIds"
            label={t("promoCodes.form.allowedProducts")}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("promoCodes.form.allowedProducts.placeholder")}
              options={products.map((p) => ({
                value: p._id,
                label: `${p.title} (${p.slug})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="excludedCategoryIds"
            label={t("promoCodes.form.excludedCategories")}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t("promoCodes.form.excludedCategories.placeholder")}
              options={categories.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="excludedSubcategoryIds"
            label={t("promoCodes.form.excludedSubcategories")}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t("promoCodes.form.excludedSubcategories.placeholder")}
              options={subcategories.map((s) => ({
                value: s._id,
                label: s.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="excludedProductIds"
            label={t("promoCodes.form.excludedProducts")}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("promoCodes.form.excludedProducts.placeholder")}
              options={products.map((p) => ({
                value: p._id,
                label: `${p.title} (${p.slug})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Stats Modal */}
      <Modal
        title={t("promoCodes.stats.title")}
        open={statsModal.open}
        onCancel={() =>
          setStatsModal({ open: false, data: null, loading: false })
        }
        footer={null}
        width={700}>
        {statsModal.loading ? (
          <Typography.Text type="secondary">
            {t("common.loading")}
          </Typography.Text>
        ) : statsModal.data ? (
          <Space
            direction="vertical"
            style={{ width: "100%" }}
            size="middle">
            <Descriptions
              bordered
              column={2}
              size="small">
              <Descriptions.Item label={t("promoCodes.stats.code")}>
                <Typography.Text strong>
                  {statsModal.data.promoCode.code}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={t("promoCodes.stats.name")}>
                {statsModal.data.promoCode.name}
              </Descriptions.Item>
              <Descriptions.Item label={t("promoCodes.stats.usageCount")}>
                {statsModal.data.usageCount}
                {statsModal.data.usageLimit != null
                  ? ` / ${statsModal.data.usageLimit}`
                  : ""}
              </Descriptions.Item>
              <Descriptions.Item label={t("promoCodes.stats.totalDiscount")}>
                <Typography.Text type="success">
                  {fmt.format(statsModal.data.totalDiscount)}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>
              {t("promoCodes.stats.orders")}
            </Typography.Title>
            <Table
              rowKey="_id"
              size="small"
              dataSource={statsModal.data.orders}
              pagination={false}
              scroll={{ x: 600 }}
              columns={[
                {
                  title: t("promoCodes.stats.orderPhone"),
                  dataIndex: "phone",
                  key: "phone",
                  width: 140,
                },
                {
                  title: t("promoCodes.stats.orderTotal"),
                  dataIndex: "total",
                  key: "total",
                  width: 120,
                  render: (v: number) => fmt.format(v),
                },
                {
                  title: t("promoCodes.stats.orderDiscount"),
                  dataIndex: "promoCodeDiscount",
                  key: "promoCodeDiscount",
                  width: 120,
                  render: (v: number) => (
                    <Typography.Text type="success">
                      -{fmt.format(v || 0)}
                    </Typography.Text>
                  ),
                },
                {
                  title: t("promoCodes.stats.orderStatus"),
                  dataIndex: "status",
                  key: "status",
                  width: 100,
                  render: (s: string) => {
                    const color =
                      s === "new"
                        ? "processing"
                        : s === "processing"
                          ? "warning"
                          : s === "done"
                            ? "success"
                            : "error";
                    return <Tag color={color}>{s}</Tag>;
                  },
                },
                {
                  title: t("promoCodes.stats.orderDate"),
                  dataIndex: "createdAt",
                  key: "createdAt",
                  width: 140,
                  render: (d: string) =>
                    d ? dayjs(d).format("DD.MM.YY HH:mm") : "—",
                },
              ]}
            />
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}
