import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Space,
  Switch,
  Table,
  Tabs,
  Drawer,
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
import type { Country } from "../api/countries";
import {
  createCountry,
  deleteCountry,
  listCountries,
  updateCountry,
} from "../api/countries";
import { slugify } from "../utils/slugify";
import { useQueryParam } from "../hooks/useQueryParam";
import { useI18n } from "../store/i18n";

type FormValues = {
  code: string;
  nameUk: string;
  nameEn?: string;
  slug: string;
  flagUrl?: string | null;
  isActive?: boolean;
};

export function CountriesPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState<Country[]>([]);
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
  const [editing, setEditing] = useState<Country | null>(null);
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCountries();
      setItems(data);
    } catch {
      message.error(t("countries.loadError"));
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
    return items.filter((c) =>
      [c.code, c.name, c.slug].some((v) => v.toLowerCase().includes(q))
    );
  }, [items, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setOpen(true);
  };

  const onEdit = (record: Country) => {
    setEditing(record);
    form.setFieldsValue({
      code: record.code,
      nameUk: record.nameI18n?.uk || record.name,
      nameEn: record.nameI18n?.en,
      slug: record.slug,
      flagUrl: record.flagUrl || undefined,
      isActive: record.isActive,
    });
    setOpen(true);
  };

  const onDelete = (record: Country) => {
    modal.confirm({
      title: t("countries.msg.delete.title").replace("{name}", record.name),
      okType: "danger",
      okText: t("countries.msg.delete.ok"),
      cancelText: t("countries.msg.delete.cancel"),
      async onOk() {
        try {
          await deleteCountry(record._id);
          message.success(t("countries.msg.delete.success"));
          await load();
        } catch {
          message.error(t("countries.msg.delete.error"));
        }
      },
    });
  };

  const onToggleActive = async (record: Country, next: boolean) => {
    try {
      await updateCountry(record._id, { isActive: next });
      setItems((prev) =>
        prev.map((c) => (c._id === record._id ? { ...c, isActive: next } : c))
      );
    } catch {
      message.error(t("countries.msg.toggleError"));
    }
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const payload: FormValues = {
      ...values,
      slug: values.slug || slugify(values.nameUk || values.nameEn || ""),
    };
    try {
      if (editing) {
        await updateCountry(editing._id, {
          ...payload,
          flagUrl: payload.flagUrl ?? undefined,
        });
        message.success(t("countries.msg.save.updated"));
      } else {
        await createCountry({
          code: payload.code,
          nameUk: payload.nameUk,
          nameEn: payload.nameEn || undefined,
          slug: payload.slug,
          flagUrl: payload.flagUrl || undefined,
          isActive: payload.isActive,
        });
        message.success(t("countries.msg.save.created"));
      }
      setOpen(false);
      await load();
    } catch {
      message.error(t("countries.msg.save.error"));
    }
  };

  const columns: ColumnsType<Country> = [
    {
      title: t("countries.columns.flag"),
      dataIndex: "flagUrl",
      key: "flagUrl",
      width: 90,
      render: (url: string | undefined) =>
        url ? (
          <img
            src={url}
            alt=""
            style={{
              width: 48,
              height: 32,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 32,
              background: token.colorFillTertiary,
              borderRadius: 4,
            }}
          />
        ),
    },
    {
      title: t("countries.columns.code"),
      dataIndex: "code",
      key: "code",
      width: 120,
    },
    { title: t("countries.columns.name"), dataIndex: "name", key: "name" },
    {
      title: t("countries.columns.slug"),
      dataIndex: "slug",
      key: "slug",
      width: 220,
    },
    {
      title: t("countries.columns.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (_: unknown, record: Country) => (
        <Switch
          checked={record.isActive}
          onChange={(val) => void onToggleActive(record, val)}
        />
      ),
    },
    {
      title: t("countries.columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 220,
    },
    {
      title: t("countries.columns.actions"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: Country) => (
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
            placeholder={t("countries.search.placeholder")}
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
            {t("countries.refresh")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}>
            {t("countries.add")}
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
              t("countries.pagination.showTotal")
                .replace("{from}", String(range[0]))
                .replace("{to}", String(range[1]))
                .replace("{total}", String(total)),
          }}
        />
      </Space>

      <Drawer
        title={
          editing
            ? t("countries.drawer.editTitle").replace("{name}", editing.name)
            : t("countries.drawer.createTitle")
        }
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        destroyOnClose={false}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>
              {t("countries.drawer.cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}>
              {t("countries.drawer.save")}
            </Button>
          </Space>
        }>
        <Form
          layout="vertical"
          form={form}
          onValuesChange={(changed) => {
            if ("nameUk" in changed || "nameEn" in changed) {
              const uk = (form.getFieldValue("nameUk") || "").trim();
              const en = (form.getFieldValue("nameEn") || "").trim();
              const base = uk || en;
              const currentSlug = (form.getFieldValue("slug") || "").trim();
              if (!currentSlug && base) {
                form.setFieldsValue({ slug: slugify(base) });
              }
            }
          }}>
          <Form.Item
            label={t("countries.form.code")}
            name="code"
            rules={[
              { required: true, message: t("countries.form.code.required") },
            ]}>
            <Input
              placeholder="UA"
              maxLength={3}
            />
          </Form.Item>

          <Tabs
            items={[
              {
                key: "uk",
                label: t("countries.form.name.uk") || "Українська",
                children: (
                  <Form.Item
                    label={t("countries.form.name")}
                    name="nameUk"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const uk = (value || "").trim();
                          const en = (getFieldValue("nameEn") || "").trim();
                          if (uk || en) return Promise.resolve();
                          return Promise.reject(
                            new Error(t("countries.form.name.required"))
                          );
                        },
                      }),
                    ]}>
                    <Input placeholder="Україна" />
                  </Form.Item>
                ),
              },
              {
                key: "en",
                label: t("countries.form.name.en") || "English",
                children: (
                  <Form.Item
                    label={t("countries.form.nameEn")}
                    name="nameEn">
                    <Input placeholder="Ukraine" />
                  </Form.Item>
                ),
              },
            ]}
          />

          <Form.Item
            label={t("countries.form.slug")}
            name="slug"
            tooltip={t("countries.form.slug.tooltip")}
            extra={(() => {
              const hint = t("countries.form.slug.hint");
              return hint && hint !== "countries.form.slug.hint"
                ? hint
                : "Слаг формируется автоматически из названия. Можно оставить как есть.";
            })()}>
            <Input placeholder="ukraine" />
          </Form.Item>

          <Form.Item
            label={t("countries.form.flag")}
            name="flagUrl"
            valuePropName="value">
            <ImageUploader folder="countries" />
          </Form.Item>

          <Form.Item
            label={t("countries.form.isActive")}
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
