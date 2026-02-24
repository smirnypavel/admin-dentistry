import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
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
import type { Subcategory } from "../api/subcategories";
import {
  createSubcategory,
  deleteSubcategory,
  listSubcategories,
  updateSubcategory,
} from "../api/subcategories";
import { listCategories, type Category } from "../api/categories";
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
  categoryId: string;
  sort?: number;
  isActive?: boolean;
};

export function SubcategoriesPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useQueryParam("q", "");
  const [filterCategoryId, setFilterCategoryId] = useQueryParam("category", "");
  const [pageStr, setPageStr] = useQueryParam("page", "1");
  const [limitStr, setLimitStr] = useQueryParam("limit", "20");
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(limitStr || "20", 10) || 20),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, cats] = await Promise.all([
        listSubcategories(),
        listCategories(),
      ]);
      setItems(subs);
      setCategories(cats);
    } catch {
      message.error(t("subcategories.loadError"));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c._id, c.name);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    let list = items;
    if (filterCategoryId) {
      list = list.filter((s) => s.categoryId === filterCategoryId);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.slug, c.description || ""].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [items, search, filterCategoryId]);

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

  const onEdit = (record: Subcategory) => {
    setEditing(record);
    form.setFieldsValue({
      nameUk: record.nameI18n?.uk || record.name,
      nameEn: record.nameI18n?.en,
      slug: record.slug,
      descUk: record.descriptionI18n?.uk,
      descEn: record.descriptionI18n?.en,
      imageUrl: record.imageUrl || undefined,
      categoryId: record.categoryId,
      sort: record.sort ?? undefined,
      isActive: record.isActive,
    });
    setOpen(true);
  };

  const onDelete = (record: Subcategory) => {
    modal.confirm({
      title: t("subcategories.msg.delete.title").replace("{name}", record.name),
      okType: "danger",
      okText: t("subcategories.msg.delete.ok"),
      cancelText: t("subcategories.msg.delete.cancel"),
      async onOk() {
        try {
          await deleteSubcategory(record._id);
          message.success(t("subcategories.msg.delete.success"));
          await load();
        } catch {
          message.error(t("subcategories.msg.delete.error"));
        }
      },
    });
  };

  const onToggleActive = async (record: Subcategory, next: boolean) => {
    try {
      await updateSubcategory(record._id, { isActive: next });
      setItems((prev) =>
        prev.map((c) => (c._id === record._id ? { ...c, isActive: next } : c)),
      );
    } catch {
      message.error(t("subcategories.msg.toggleError"));
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
        await updateSubcategory(editing._id, {
          ...payload,
          imageUrl: payload.imageUrl ?? undefined,
        });
        message.success(t("subcategories.msg.save.updated"));
      } else {
        await createSubcategory({
          nameUk: payload.nameUk,
          nameEn: payload.nameEn || undefined,
          slug: payload.slug,
          descUk: payload.descUk || undefined,
          descEn: payload.descEn || undefined,
          imageUrl: payload.imageUrl || undefined,
          categoryId: payload.categoryId,
          sort: payload.sort,
          isActive: payload.isActive,
        });
        message.success(t("subcategories.msg.save.created"));
      }
      setOpen(false);
      await load();
    } catch {
      message.error(t("subcategories.msg.save.error"));
    }
  };

  const columns: ColumnsType<Subcategory> = [
    {
      title: t("subcategories.columns.preview"),
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
    {
      title: t("subcategories.columns.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("subcategories.columns.category"),
      dataIndex: "categoryId",
      key: "categoryId",
      width: 200,
      render: (id: string) => categoryMap.get(id) || id,
    },
    {
      title: t("subcategories.columns.slug"),
      dataIndex: "slug",
      key: "slug",
      width: 200,
    },
    {
      title: t("subcategories.columns.sort"),
      dataIndex: "sort",
      key: "sort",
      width: 120,
      render: (v: number | null | undefined) => v ?? 0,
    },
    {
      title: t("subcategories.columns.isActive"),
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (_: unknown, record: Subcategory) => (
        <Switch
          checked={record.isActive}
          onChange={(val) => void onToggleActive(record, val)}
        />
      ),
    },
    {
      title: t("subcategories.columns.updatedAt"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 220,
    },
    {
      title: t("subcategories.columns.actions"),
      key: "actions",
      width: 140,
      render: (_: unknown, record: Subcategory) => (
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
        <Space wrap>
          <Input.Search
            placeholder={t("subcategories.search.placeholder")}
            allowClear
            enterButton
            style={{ width: 320 }}
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
          <Select
            allowClear
            placeholder={t("subcategories.filter.category")}
            style={{ width: 240 }}
            value={filterCategoryId || undefined}
            onChange={(v) => {
              setFilterCategoryId(v || "");
              setPageStr("1");
            }}
            options={categories.map((c) => ({
              value: c._id,
              label: c.name,
            }))}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void load()}>
            {t("subcategories.refresh")}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}>
            {t("subcategories.add")}
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
              t("subcategories.pagination.showTotal")
                .replace("{from}", String(range[0]))
                .replace("{to}", String(range[1]))
                .replace("{total}", String(total)),
          }}
        />
      </Space>

      <Drawer
        title={
          editing
            ? t("subcategories.drawer.editTitle").replace(
                "{name}",
                editing.name,
              )
            : t("subcategories.drawer.createTitle")
        }
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        destroyOnClose={false}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>
              {t("subcategories.drawer.cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}>
              {t("subcategories.drawer.save")}
            </Button>
          </Space>
        }>
        <Form
          layout="vertical"
          form={form}
          onValuesChange={(changed) => {
            if ("nameUk" in changed || "nameEn" in changed) {
              const currentSlug = (form.getFieldValue("slug") || "").trim();
              if (currentSlug) return;
              const uk = (form.getFieldValue("nameUk") || "").trim();
              const en = (form.getFieldValue("nameEn") || "").trim();
              const base = uk || en;
              if (base) {
                form.setFieldsValue({ slug: slugify(base) });
              }
            }
          }}>
          <Form.Item
            label={t("subcategories.form.category")}
            name="categoryId"
            rules={[
              {
                required: true,
                message: t("subcategories.form.category.required"),
              },
            ]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("subcategories.form.category.placeholder")}
              options={categories.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
            />
          </Form.Item>

          <Tabs
            items={[
              {
                key: "uk",
                label: t("subcategories.form.name.uk") || "Українська",
                children: (
                  <>
                    <Form.Item
                      label={t("subcategories.form.name")}
                      name="nameUk"
                      rules={[
                        {
                          required: true,
                          message: t("subcategories.form.name.required"),
                        },
                      ]}>
                      <Input
                        placeholder={t("subcategories.form.name.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("subcategories.form.description")}
                      name="descUk">
                      <Input.TextArea
                        rows={4}
                        placeholder={t(
                          "subcategories.form.description.placeholder",
                        )}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "en",
                label: t("subcategories.form.name.en") || "English",
                children: (
                  <>
                    <Form.Item
                      label={t("subcategories.form.nameEn")}
                      name="nameEn">
                      <Input placeholder="Composites" />
                    </Form.Item>
                    <Form.Item
                      label={t("subcategories.form.descriptionEn")}
                      name="descEn">
                      <Input.TextArea
                        rows={4}
                        placeholder="Subcategory description"
                      />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Form.Item
            label={t("subcategories.form.slug")}
            name="slug"
            tooltip={t("subcategories.form.slug.tooltip")}
            extra={(() => {
              const hint = t("subcategories.form.slug.hint");
              return hint && hint !== "subcategories.form.slug.hint"
                ? hint
                : "Слаг формируется автоматически из названия.";
            })()}>
            <Input placeholder={t("subcategories.form.slug.placeholder")} />
          </Form.Item>

          <Form.Item
            label={t("subcategories.form.image")}
            name="imageUrl"
            valuePropName="value">
            <ImageUploader folder="subcategories" />
          </Form.Item>

          <Space size="large">
            <Form.Item
              label={t("subcategories.form.sort")}
              name="sort"
              initialValue={0}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item
              label={t("subcategories.form.isActive")}
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
