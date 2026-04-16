import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Switch,
  Table,
  Space,
  Modal,
  InputNumber,
  Tag,
  Popconfirm,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { ImageUploader } from "../components/ImageUploader";
import {
  listPromoSlides,
  createPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
  reorderPromoSlides,
  type PromoSlide,
  type PromoSlideFeature,
} from "../api/promo-slides";
import { useI18n } from "../store/i18n";

type FeatureRow = PromoSlideFeature & { _key: string };

type FormValues = {
  title: string;
  description?: string;
  price?: string;
  oldPrice?: string;
  badge?: string;
  imageUrl?: string;
  color?: string;
  linkUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

let featureKeyCounter = 0;

export function PromoSlidesPage() {
  const { message } = AntApp.useApp();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoSlide | null>(null);
  const [features, setFeatures] = useState<FeatureRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSlides(await listPromoSlides());
    } catch {
      message.error(t("promoSlides.loadError"));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, color: "from-yellow-300 to-yellow-400" });
    setFeatures([]);
    setModalOpen(true);
  };

  const openEdit = (record: PromoSlide) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description || undefined,
      price: record.price || undefined,
      oldPrice: record.oldPrice || undefined,
      badge: record.badge || undefined,
      imageUrl: record.imageUrl || undefined,
      color: record.color || undefined,
      linkUrl: record.linkUrl || undefined,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setFeatures(
      (record.features || []).map((f) => ({
        ...f,
        _key: `fk-${featureKeyCounter++}`,
      })),
    );
    setModalOpen(true);
  };

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      title: v.title,
      description: v.description?.trim() || undefined,
      price: v.price?.trim() || undefined,
      oldPrice: v.oldPrice?.trim() || undefined,
      badge: v.badge?.trim() || undefined,
      imageUrl: v.imageUrl?.trim() || undefined,
      color: v.color?.trim() || undefined,
      linkUrl: v.linkUrl?.trim() || undefined,
      sortOrder: v.sortOrder,
      isActive: !!v.isActive,
      features: features
        .filter((f) => f.text.trim())
        .map((f) => ({
          text: f.text.trim(),
          href: f.href?.trim() || undefined,
        })),
    };
    try {
      if (editing?._id) {
        await updatePromoSlide(editing._id, payload);
      } else {
        await createPromoSlide(payload);
      }
      message.success(t("promoSlides.save.success"));
      setModalOpen(false);
      await load();
    } catch {
      message.error(t("promoSlides.save.error"));
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deletePromoSlide(id);
      message.success(t("promoSlides.delete.success"));
      await load();
    } catch {
      message.error(t("promoSlides.delete.error"));
    }
  };

  const moveSlide = async (index: number, dir: -1 | 1) => {
    const newSlides = [...slides];
    const target = index + dir;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    setSlides(newSlides);
    try {
      await reorderPromoSlides(newSlides.map((s) => s._id));
    } catch {
      message.error(t("promoSlides.reorder.error"));
      await load();
    }
  };

  /* ── Features sub-form ── */
  const addFeature = () => {
    setFeatures((prev) => [
      ...prev,
      { text: "", href: undefined, _key: `fk-${featureKeyCounter++}` },
    ]);
  };

  const updateFeature = (key: string, field: "text" | "href", value: string) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f._key === key ? { ...f, [field]: value } : f,
      ),
    );
  };

  const removeFeature = (key: string) => {
    setFeatures((prev) => prev.filter((f) => f._key !== key));
  };

  const columns = [
    {
      title: "↕",
      width: 70,
      render: (_: unknown, __: PromoSlide, index: number) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => moveSlide(index, -1)}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === slides.length - 1}
            onClick={() => moveSlide(index, 1)}
          />
        </Space>
      ),
    },
    {
      title: t("promoSlides.col.image"),
      dataIndex: "imageUrl",
      width: 80,
      render: (url: string | null) =>
        url ? (
          <img
            src={url}
            alt=""
            style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: "#f0f0f0",
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              color: "#bbb",
              fontSize: 12,
            }}
          >
            —
          </div>
        ),
    },
    {
      title: t("promoSlides.col.title"),
      dataIndex: "title",
      ellipsis: true,
    },
    {
      title: t("promoSlides.col.price"),
      width: 140,
      render: (_: unknown, r: PromoSlide) => (
        <Space direction="vertical" size={0}>
          {r.price && <span style={{ fontWeight: 600 }}>{r.price}</span>}
          {r.oldPrice && (
            <span style={{ textDecoration: "line-through", color: "#999", fontSize: 12 }}>
              {r.oldPrice}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: t("promoSlides.col.badge"),
      dataIndex: "badge",
      width: 140,
      render: (badge: string | null) => (badge ? <Tag color="gold">{badge}</Tag> : "—"),
    },
    {
      title: t("promoSlides.col.active"),
      dataIndex: "isActive",
      width: 80,
      render: (v: boolean) => (
        <Tag color={v ? "green" : "default"}>{v ? "Так" : "Ні"}</Tag>
      ),
    },
    {
      title: t("promoSlides.col.actions"),
      width: 120,
      render: (_: unknown, record: PromoSlide) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title={t("promoSlides.delete.confirmTitle")}
            onConfirm={() => onDelete(record._id)}
            okType="danger"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Space>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t("promoSlides.pageTitle")}
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("promoSlides.actions.create")}
          </Button>
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={slides}
          columns={columns}
          pagination={false}
          size="middle"
        />

        <Modal
          open={modalOpen}
          title={
            editing
              ? t("promoSlides.modal.editTitle")
              : t("promoSlides.modal.createTitle")
          }
          onCancel={() => setModalOpen(false)}
          onOk={() => void onSave()}
          width={640}
          destroyOnClose
        >
          <Form<FormValues> layout="vertical" form={form}>
            <Form.Item
              label={t("promoSlides.form.title")}
              name="title"
              rules={[{ required: true, message: t("promoSlides.form.title.required") }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label={t("promoSlides.form.description")}
              name="description"
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Space wrap>
              <Form.Item label={t("promoSlides.form.price")} name="price">
                <Input placeholder="2 500 ₴" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label={t("promoSlides.form.oldPrice")} name="oldPrice">
                <Input placeholder="2 940 ₴" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label={t("promoSlides.form.badge")} name="badge">
                <Input placeholder="Хіт продажів" style={{ width: 180 }} />
              </Form.Item>
            </Space>

            <Form.Item
              label={t("promoSlides.form.image")}
              name="imageUrl"
              valuePropName="value"
            >
              <ImageUploader
                folder="promo-slides"
                accept={["image/jpeg", "image/png", "image/webp"]}
                maxSizeMB={2}
              />
            </Form.Item>

            <Space wrap>
              <Form.Item label={t("promoSlides.form.color")} name="color">
                <Input
                  placeholder="from-yellow-300 to-yellow-400"
                  style={{ width: 280 }}
                />
              </Form.Item>
              <Form.Item label={t("promoSlides.form.linkUrl")} name="linkUrl">
                <Input placeholder="/catalog/brekety" style={{ width: 240 }} />
              </Form.Item>
            </Space>

            <Space wrap>
              <Form.Item label={t("promoSlides.form.sortOrder")} name="sortOrder">
                <InputNumber min={0} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item
                label={t("promoSlides.form.isActive")}
                name="isActive"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Space>

            {/* Features sub-form */}
            <div style={{ marginTop: 8 }}>
              <Typography.Text strong>
                {t("promoSlides.form.features")}
              </Typography.Text>
              <div style={{ marginTop: 8 }}>
                {features.map((f) => (
                  <Space
                    key={f._key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="start"
                  >
                    <Input
                      placeholder={t("promoSlides.form.feature.text")}
                      value={f.text}
                      onChange={(e) =>
                        updateFeature(f._key, "text", e.target.value)
                      }
                      style={{ width: 260 }}
                    />
                    <Input
                      placeholder={t("promoSlides.form.feature.href")}
                      value={f.href || ""}
                      onChange={(e) =>
                        updateFeature(f._key, "href", e.target.value)
                      }
                      style={{ width: 200 }}
                    />
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeFeature(f._key)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addFeature}
                  size="small"
                >
                  {t("promoSlides.form.feature.add")}
                </Button>
              </div>
            </div>
          </Form>
        </Modal>
      </Space>
    </AdminLayout>
  );
}

export default PromoSlidesPage;
