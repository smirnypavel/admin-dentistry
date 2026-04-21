import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Rate,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  adminCreateReview,
  adminDeleteReview,
  adminUpdateReview,
  listReviews,
  type AdminCreateReviewBody,
  type ProductReview,
  type ReviewsPage,
} from "../api/reviews";
import { listProducts } from "../api/products";

type ProductOption = { _id: string; slug: string; title: string };

export function ReviewsPage() {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewsPage | null>(null);
  const [page, setPage] = useState(1);
  const [isApproved, setIsApprovedFilter] = useState<"" | "true" | "false">("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [form] = Form.useForm<AdminCreateReviewBody>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listReviews({
        page,
        limit: 20,
        isApproved: isApproved || undefined,
      });
      setData(res);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Помилка завантаження відгуків");
    } finally {
      setLoading(false);
    }
  }, [page, isApproved, message]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApproveToggle = async (record: ProductReview, value: boolean) => {
    try {
      await adminUpdateReview(record._id, { isApproved: value });
      message.success(value ? "Відгук опубліковано" : "Відгук приховано");
      load();
    } catch {
      message.error("Помилка оновлення");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteReview(id);
      message.success("Відгук видалено");
      load();
    } catch {
      message.error("Помилка видалення");
    }
  };

  const openAddDrawer = async () => {
    try {
      const res = await listProducts({ limit: 200 });
      setProducts(
        (res.items || []).map((p: any) => ({
          _id: p._id,
          slug: p.slug,
          title: p.titleI18n?.uk || p.slug,
        }))
      );
    } catch {}
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await adminCreateReview(values);
      message.success("Відгук додано");
      setDrawerOpen(false);
      load();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Помилка створення");
    }
  };

  const items = data?.items || [];

  const columns: ColumnsType<ProductReview> = [
    {
      title: "Товар",
      dataIndex: "productId",
      width: 160,
      render: (id: string) => <span className="text-xs text-gray-500">{id?.slice(-6)}</span>,
    },
    {
      title: "Автор",
      dataIndex: "authorName",
      render: (name: string) => name || "—",
    },
    {
      title: "Оцінка",
      dataIndex: "rating",
      width: 160,
      render: (r: number) => <Rate disabled defaultValue={r} style={{ fontSize: 14 }} />,
    },
    {
      title: "Коментар",
      dataIndex: "comment",
      render: (c?: string) => c || <span className="text-gray-400 text-xs">—</span>,
    },
    {
      title: "Джерело",
      dataIndex: "source",
      width: 100,
      render: (s: string) => (
        <Tag color={s === "admin" ? "blue" : "default"}>{s === "admin" ? "Адмін" : "Клієнт"}</Tag>
      ),
    },
    {
      title: "Опублікований",
      dataIndex: "isApproved",
      width: 120,
      render: (val: boolean, record: ProductReview) => (
        <Switch
          size="small"
          checked={val}
          onChange={(v) => handleApproveToggle(record, v)}
        />
      ),
    },
    {
      title: "Дата",
      dataIndex: "createdAt",
      width: 100,
      render: (d?: string) =>
        d ? new Date(d).toLocaleDateString("uk-UA") : "—",
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, record: ProductReview) => (
        <Space>
          <Popconfirm
            title="Видалити відгук?"
            onConfirm={() => handleDelete(record._id)}
            okText="Так"
            cancelText="Ні"
          >
            <Button size="small" danger>
              Видалити
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontWeight: 600 }}>Відгуки</h2>
          <Space>
            <Select
              value={isApproved}
              onChange={(v) => { setIsApprovedFilter(v); setPage(1); }}
              style={{ width: 160 }}
              options={[
                { value: "", label: "Всі" },
                { value: "true", label: "Опубліковані" },
                { value: "false", label: "На перевірці" },
              ]}
            />
            <Button type="primary" onClick={openAddDrawer}>
              + Додати відгук
            </Button>
          </Space>
        </div>

        <Table<ProductReview>
          rowKey="_id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: (p) => setPage(p),
            showTotal: (total) => `Всього: ${total}`,
          }}
        />

        <Drawer
          title="Додати відгук"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={440}
          footer={
            <Space style={{ justifyContent: "flex-end", display: "flex" }}>
              <Button onClick={() => setDrawerOpen(false)}>Скасувати</Button>
              <Button type="primary" onClick={handleCreate}>
                Зберегти
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            <Form.Item name="productId" label="Товар" rules={[{ required: true, message: "Оберіть товар" }]}>
              <Select
                showSearch
                placeholder="Оберіть товар"
                optionFilterProp="label"
                options={products.map((p) => ({ value: p._id, label: p.title }))}
              />
            </Form.Item>
            <Form.Item name="authorName" label="Автор">
              <Input placeholder="Ім'я автора" maxLength={120} />
            </Form.Item>
            <Form.Item name="rating" label="Оцінка" rules={[{ required: true, message: "Вкажіть оцінку" }]}>
              <Rate />
            </Form.Item>
            <Form.Item name="comment" label="Коментар">
              <Input.TextArea rows={4} maxLength={1200} showCount />
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </AdminLayout>
  );
}
