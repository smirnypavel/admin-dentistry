import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Tabs,
  App as AntApp,
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
import type { Category } from "../api/categories";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../api/categories";
import { slugify } from "../utils/slugify";
import { useQueryParam } from "../hooks/useQueryParam";
import { useI18n } from "../store/i18n";

type FormValues = {
  nameUk: string;
  nameEn?: string;
  slug: string;
  descUk?: string;
  descEn?: string;
  imageUrl?: string | null;
  sort?: number;
  isActive?: boolean;
};

export function CategoriesPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState<Category[]>([]);
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
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCategories();
      setItems(data);
    } catch {
      message.error(t("categories.loadError"));
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
      [c.name, c.slug, c.description || ""].some((v) =>
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
    form.setFieldsValue({ isActive: true, sort: 0 });
    setOpen(true);
  };

  const onEdit = (record: Category) => {
    setEditing(record);
    form.setFieldsValue({
      nameUk: record.nameI18n?.uk || record.name,
      nameEn: record.nameI18n?.en,
      slug: record.slug,
      descUk: record.descriptionI18n?.uk,
      descEn: record.descriptionI18n?.en,
      imageUrl: record.imageUrl || undefined,
      sort: record.sort ?? undefined,
      isActive: record.isActive,
    });
    setOpen(true);
  };

  const onDelete = (record: Category) => {
    modal.confirm({
      title: t("categories.msg.delete.title").replace("{name}", record.name),
      okType: "danger",
      okText: t("categories.msg.delete.ok"),
      cancelText: t("categories.msg.delete.cancel"),
      async onOk() {
        try {
          await deleteCategory(record._id);
          message.success(t("categories.msg.delete.success"));
          await load();
        } catch {
          message.error(t("categories.msg.delete.error"));
        }
      },
    });
  };

  const onToggleActive = async (record: Category, next: boolean) => {
    try {
      await updateCategory(record._id, { isActive: next });
      setItems((prev) =>
        prev.map((c) => (c._id === record._id ? { ...c, isActive: next } : c))
      );
    } catch {
      message.error(t("categories.msg.toggleError"));
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
        await updateCategory(editing._id, {
          ...payload,
          imageUrl: payload.imageUrl ?? undefined,
        });
        message.success(t("categories.msg.save.updated"));
      } else {
        await createCategory({
          nameUk: payload.nameUk,
          nameEn: payload.nameEn || undefined,
          slug: payload.slug,
          descUk: payload.descUk || undefined,
          descEn: payload.descEn || undefined,
          imageUrl: payload.imageUrl || undefined,
          sort: payload.sort,
          isActive: payload.isActive,
        });
        message.success(t("categories.msg.save.created"));
      }
      setOpen(false);
      await load();
    } catch {
      message.error(t("categories.msg.save.error"));
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: t("categories.columns.preview"),
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 90,
      render: (url: string | undefined) =>
        url ? (
          <img
            src={url}
            alt=""
            style={{
              width: 64,
              height: 40,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 40,
              background: token.colorFillTertiary,
              borderRadius: 4,
            }}
          />
        ),
    },
    { title: t("categories.columns.name"), dataIndex: "name", key: "name" },
    {
      title: t("categories.columns.slug"),
      dataIndex: "slug",
      key: "slug",
      width: 220,
    },
    {
      title: t("categories.columns.sort"),
      dataIndex: "sort",
      key: "sort",
      width: 120,
      render: (v: number | null | undefined) => v ?? 0,
    },
    {
      title: t("categories.columns.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (_: unknown, record: Category) => (
        <Switch
          checked={record.isActive}
          onChange={(val) => void onToggleActive(record, val)}
        />
      ),
    },
    {
      title: t("categories.columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 220,
    },
    {
      title: t("categories.columns.actions"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: Category) => (
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
            placeholder={t("categories.search.placeholder")}
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
            {t("categories.refresh")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}>
            {t("categories.add")}
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
              t("categories.pagination.showTotal")
                .replace("{from}", String(range[0]))
                .replace("{to}", String(range[1]))
                .replace("{total}", String(total)),
          }}
        />
      </Space>

      <Drawer
        title={
          editing
            ? t("categories.drawer.editTitle").replace("{name}", editing.name)
            : t("categories.drawer.createTitle")
        }
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        destroyOnClose={false}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>
              {t("categories.drawer.cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}>
              {t("categories.drawer.save")}
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
          <Tabs
            items={[
              {
                key: "uk",
                label: t("categories.form.name.uk") || "Українська",
                children: (
                  <>
                    <Form.Item
                      label={t("categories.form.name")}
                      name="nameUk"
                      rules={[
                        {
                          required: true,
                          message: t("categories.form.name.required"),
                        },
                      ]}>
                      <Input
                        placeholder={t("categories.form.name.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("categories.form.description")}
                      name="descUk">
                      <Input.TextArea
                        rows={4}
                        placeholder={t(
                          "categories.form.description.placeholder"
                        )}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "en",
                label: t("categories.form.name.en") || "English",
                children: (
                  <>
                    <Form.Item
                      label={t("categories.form.nameEn")}
                      name="nameEn">
                      <Input placeholder="Composites" />
                    </Form.Item>
                    <Form.Item
                      label={t("categories.form.descriptionEn")}
                      name="descEn">
                      <Input.TextArea
                        rows={4}
                        placeholder="Category description"
                      />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item
            label={t("categories.form.slug")}
            name="slug"
            tooltip={t("categories.form.slug.tooltip")}>
            <Input placeholder={t("categories.form.slug.placeholder")} />
          </Form.Item>

          <Form.Item
            label={t("categories.form.image")}
            name="imageUrl"
            valuePropName="value">
            <ImageUploader folder="categories" />
          </Form.Item>

          <Space size="large">
            <Form.Item
              label={t("categories.form.sort")}
              name="sort"
              initialValue={0}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item
              label={t("categories.form.isActive")}
              name="isActive"
              valuePropName="checked"
              initialValue>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </AdminLayout>
  );
}
