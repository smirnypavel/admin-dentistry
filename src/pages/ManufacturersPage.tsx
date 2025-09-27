import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  theme as antdTheme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "../components/AdminLayout";
import { ImageUploader } from "../components/ImageUploader";
import type { Manufacturer } from "../api/manufacturers";
import {
  createManufacturer,
  deleteManufacturer,
  listManufacturers,
  updateManufacturer,
} from "../api/manufacturers";
import type { Country } from "../api/countries";
import { listCountries } from "../api/countries";
import { slugify } from "../utils/slugify";
import { useQueryParam } from "../hooks/useQueryParam";
import { useI18n } from "../store/i18n";

type FormValues = {
  nameUk: string;
  nameEn?: string;
  slug: string;
  countryIds?: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string;
  descUk?: string;
  descEn?: string;
  isActive?: boolean;
};

export function ManufacturersPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useQueryParam("q", "");
  const [pageStr, setPageStr] = useQueryParam("page", "1");
  const [limitStr, setLimitStr] = useQueryParam("limit", "20");
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(limitStr || "20", 10) || 20)
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [form] = Form.useForm<FormValues>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mans, cs] = await Promise.all([
        listManufacturers(),
        listCountries(),
      ]);
      setItems(mans);
      setCountries(cs);
    } catch {
      message.error(t("manufacturers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      [m.name, m.slug, m.website || ""].some((v) =>
        v?.toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, countryIds: [] });
    setOpen(true);
  };

  const onEdit = (record: Manufacturer) => {
    setEditing(record);
    form.setFieldsValue({
      nameUk: record.nameI18n?.uk || record.name,
      nameEn: record.nameI18n?.en,
      slug: record.slug,
      countryIds: record.countryIds || [],
      logoUrl: record.logoUrl || undefined,
      bannerUrl: record.bannerUrl || undefined,
      website: record.website || undefined,
      descUk: record.descriptionI18n?.uk,
      descEn: record.descriptionI18n?.en,
      isActive: record.isActive,
    });
    setOpen(true);
  };

  const onDelete = (record: Manufacturer) => {
    modal.confirm({
      title: t("manufacturers.msg.delete.title").replace("{name}", record.name),
      okType: "danger",
      okText: t("manufacturers.msg.delete.ok"),
      cancelText: t("manufacturers.msg.delete.cancel"),
      async onOk() {
        try {
          await deleteManufacturer(record._id);
          message.success(t("manufacturers.msg.delete.success"));
          await load();
        } catch {
          message.error(t("manufacturers.msg.delete.error"));
        }
      },
    });
  };

  const onToggleActive = async (record: Manufacturer, next: boolean) => {
    try {
      await updateManufacturer(record._id, { isActive: next });
      setItems((prev) =>
        prev.map((m) => (m._id === record._id ? { ...m, isActive: next } : m))
      );
    } catch {
      message.error(t("manufacturers.msg.toggleError"));
    }
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const payload: FormValues = {
      ...values,
      slug: values.slug || slugify(values.nameUk),
    };
    try {
      if (editing) {
        await updateManufacturer(editing._id, {
          ...payload,
          logoUrl: payload.logoUrl ?? undefined,
          bannerUrl: payload.bannerUrl ?? undefined,
        });
        message.success(t("manufacturers.msg.save.updated"));
      } else {
        await createManufacturer({
          nameUk: payload.nameUk,
          nameEn: payload.nameEn || undefined,
          slug: payload.slug,
          countryIds: payload.countryIds || [],
          logoUrl: payload.logoUrl || undefined,
          bannerUrl: payload.bannerUrl || undefined,
          website: payload.website || undefined,
          descUk: payload.descUk || undefined,
          descEn: payload.descEn || undefined,
          isActive: payload.isActive,
        });
        message.success(t("manufacturers.msg.save.created"));
      }
      setOpen(false);
      await load();
    } catch {
      message.error(t("manufacturers.msg.save.error"));
    }
  };

  const columns: ColumnsType<Manufacturer> = [
    {
      title: t("manufacturers.columns.logo"),
      dataIndex: "logoUrl",
      key: "logoUrl",
      width: 80,
      render: (url: string | undefined) =>
        url ? (
          <img
            src={url}
            alt=""
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 6,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              background: token.colorFillTertiary,
              borderRadius: 6,
            }}
          />
        ),
    },
    { title: t("manufacturers.columns.name"), dataIndex: "name", key: "name" },
    {
      title: t("manufacturers.columns.slug"),
      dataIndex: "slug",
      key: "slug",
      width: 220,
    },
    {
      title: t("manufacturers.columns.countries"),
      key: "countries",
      render: (_: unknown, record) => record.countryIds?.length || 0,
      width: 120,
    },
    {
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (_: unknown, record: Manufacturer) => (
        <Switch
          checked={record.isActive}
          onChange={(val) => void onToggleActive(record, val)}
        />
      ),
    },
    {
      title: t("manufacturers.columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 220,
    },
    {
      title: t("manufacturers.columns.actions"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: Manufacturer) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}>
            {t("common.edit")}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}>
            {t("common.delete")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        {/* Page title removed (shown in header) */}
        <Space>
          <Input.Search
            placeholder={t("manufacturers.search.placeholder")}
            allowClear
            enterButton
            style={{ width: 420 }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageStr("1");
            }}
            onSearch={(v) => {
              setSearch(v);
              setPageStr("1");
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void load()}>
            {t("manufacturers.refresh")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}>
            {t("manufacturers.add")}
          </Button>
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={paginated}
          pagination={{
            current: page,
            pageSize: limit,
            total: filtered.length,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (p, ps) => {
              setPageStr(String(p));
              setLimitStr(String(ps));
            },
            showTotal: (total, range) =>
              t("manufacturers.pagination.showTotal")
                .replace("{from}", String(range[0]))
                .replace("{to}", String(range[1]))
                .replace("{total}", String(total)),
          }}
        />
      </Space>

      <Drawer
        title={
          editing
            ? t("manufacturers.drawer.editTitle").replace(
                "{name}",
                editing.name
              )
            : t("manufacturers.drawer.createTitle")
        }
        open={open}
        onClose={() => setOpen(false)}
        width={720}
        destroyOnClose={false}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>
              {t("manufacturers.drawer.cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}>
              {t("manufacturers.drawer.save")}
            </Button>
          </Space>
        }>
        <Form
          layout="vertical"
          form={form}
          onValuesChange={(changed) => {
            if ("nameUk" in changed) {
              const name = String(changed.nameUk ?? "");
              const currentSlug = form.getFieldValue("slug");
              if (!currentSlug) {
                form.setFieldsValue({ slug: slugify(name) });
              }
            }
          }}>
          <Tabs
            items={[
              {
                key: "uk",
                label: t("manufacturers.form.name.uk") || "Українська",
                children: (
                  <>
                    <Form.Item
                      label={t("manufacturers.form.name")}
                      name="nameUk"
                      rules={[
                        {
                          required: true,
                          message: t("manufacturers.form.name.required"),
                        },
                      ]}>
                      <Input placeholder="3M" />
                    </Form.Item>
                    <Form.Item
                      label={t("manufacturers.form.description")}
                      name="descUk">
                      <Input.TextArea rows={4} placeholder={t("manufacturers.form.description.placeholder")} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "en",
                label: t("manufacturers.form.name.en") || "English",
                children: (
                  <>
                    <Form.Item label={t("manufacturers.form.nameEn")} name="nameEn">
                      <Input placeholder="3M" />
                    </Form.Item>
                    <Form.Item label={t("manufacturers.form.descriptionEn")} name="descEn">
                      <Input.TextArea rows={4} placeholder="Manufacturer description" />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item
            label={t("manufacturers.form.slug")}
            name="slug"
            tooltip={t("manufacturers.form.slug.tooltip")}>
            <Input placeholder="3m" />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.countries")}
            name="countryIds">
            <Select
              mode="multiple"
              placeholder={t("manufacturers.form.countries.placeholder")}
              options={countries.map((c) => ({
                label: `${c.name} (${c.code})`,
                value: c._id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.logo")}
            name="logoUrl"
            valuePropName="value">
            <ImageUploader folder="manufacturers" />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.banner")}
            name="bannerUrl"
            valuePropName="value">
            <ImageUploader folder="manufacturers" />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.website")}
            name="website">
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.description")}
            name="description">
            <Input.TextArea
              rows={4}
              placeholder={t("manufacturers.form.description.placeholder")}
            />
          </Form.Item>

          <Form.Item
            label={t("manufacturers.form.isActive")}
            name="isActive"
            valuePropName="checked"
            initialValue>
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </AdminLayout>
  );
}
