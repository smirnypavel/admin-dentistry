import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Alert,
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

const SLOT = "grid" as const;
const MAX_SLIDES = 12;

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

export function PromoGridPage() {
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
      setSlides(await listPromoSlides(SLOT));
    } catch {
      message.error("Не вдалося завантажити товари сітки");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (slides.length >= MAX_SLIDES) {
      void message.warning(`Максимум ${MAX_SLIDES} товарів у сітці. Видаліть один, щоб додати новий.`);
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, color: "from-blue-400 to-blue-600" });
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
        await createPromoSlide({ ...payload, slot: SLOT });
      }
      message.success("Збережено");
      setModalOpen(false);
      await load();
    } catch {
      message.error("Не вдалося зберегти");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deletePromoSlide(id);
      message.success("Видалено");
      await load();
    } catch {
      message.error("Не вдалося видалити");
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
      message.error("Не вдалося змінити порядок");
      await load();
    }
  };

  const addFeature = () => {
    setFeatures((prev) => [
      ...prev,
      { text: "", href: undefined, _key: `fk-${featureKeyCounter++}` },
    ]);
  };

  const updateFeature = (key: string, field: "text" | "href", value: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f._key === key ? { ...f, [field]: value } : f)),
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
      title: "Фото",
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
      title: "Назва",
      dataIndex: "title",
      ellipsis: true,
    },
    {
      title: "Ціна",
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
      title: "Бейдж",
      dataIndex: "badge",
      width: 140,
      render: (badge: string | null) => (badge ? <Tag color="gold">{badge}</Tag> : "—"),
    },
    {
      title: "Активний",
      dataIndex: "isActive",
      width: 80,
      render: (v: boolean) => (
        <Tag color={v ? "green" : "default"}>{v ? "Так" : "Ні"}</Tag>
      ),
    },
    {
      title: "Дії",
      width: 120,
      render: (_: unknown, record: PromoSlide) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Видалити товар?"
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
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              🗂 Акції Сітка
            </Typography.Title>
            <Tag color={slides.length >= MAX_SLIDES ? "red" : "blue"}>
              {slides.length} / {MAX_SLIDES}
            </Tag>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={slides.length >= MAX_SLIDES}
          >
            Додати товар
          </Button>
        </Space>

        {slides.length >= MAX_SLIDES && (
          <Alert
            type="warning"
            showIcon
            message={`Досягнуто максимум ${MAX_SLIDES} товарів. Видаліть один, щоб додати новий.`}
          />
        )}

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
          title={editing ? "Редагувати товар" : "Новий товар сітки"}
          onCancel={() => setModalOpen(false)}
          onOk={() => void onSave()}
          width={640}
          destroyOnClose
        >
          <Form<FormValues> layout="vertical" form={form}>
            <Form.Item
              label="Назва"
              name="title"
              rules={[{ required: true, message: "Вкажіть назву" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Опис" name="description">
              <Input.TextArea rows={3} />
            </Form.Item>

            <Space wrap>
              <Form.Item label="Акційна ціна" name="price">
                <Input placeholder="2 500 ₴" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label="Стара ціна" name="oldPrice">
                <Input placeholder="2 940 ₴" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label="Бейдж" name="badge">
                <Input placeholder="Хіт продажів" style={{ width: 180 }} />
              </Form.Item>
            </Space>

            <Form.Item label="Фото" name="imageUrl" valuePropName="value">
              <ImageUploader
                folder="promo-slides"
                accept={["image/jpeg", "image/png", "image/webp"]}
                maxSizeMB={2}
              />
            </Form.Item>

            <Space wrap>
              <Form.Item label="Колір (Tailwind градієнт)" name="color">
                <Input
                  placeholder="from-blue-400 to-blue-600"
                  style={{ width: 280 }}
                />
              </Form.Item>
              <Form.Item label="Посилання" name="linkUrl">
                <Input placeholder="/catalog/brekety" style={{ width: 240 }} />
              </Form.Item>
            </Space>

            <Space wrap>
              <Form.Item label="Порядок" name="sortOrder">
                <InputNumber min={0} style={{ width: 100 }} />
              </Form.Item>
              <Form.Item label="Активний" name="isActive" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>

            <div style={{ marginTop: 8 }}>
              <Typography.Text strong>Особливості (список)</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {features.map((f) => (
                  <Space
                    key={f._key}
                    style={{ display: "flex", marginBottom: 8 }}
                    align="start"
                  >
                    <Input
                      placeholder="Текст"
                      value={f.text}
                      onChange={(e) => updateFeature(f._key, "text", e.target.value)}
                      style={{ width: 260 }}
                    />
                    <Input
                      placeholder="Посилання (необов'язково)"
                      value={f.href || ""}
                      onChange={(e) => updateFeature(f._key, "href", e.target.value)}
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
                <Button type="dashed" icon={<PlusOutlined />} onClick={addFeature} size="small">
                  Додати
                </Button>
              </div>
            </div>
          </Form>
        </Modal>
      </Space>
    </AdminLayout>
  );
}

export default PromoGridPage;
