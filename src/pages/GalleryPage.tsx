import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Card,
  Image,
  Popconfirm,
  Space,
  Switch,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "../components/AdminLayout";
import { ImageUploader } from "../components/ImageUploader";
import {
  listGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  type GalleryImage,
} from "../api/gallery";
import { useI18n } from "../store/i18n";

const { Title, Text } = Typography;

export function GalleryPage() {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGalleryImages();
      setImages(data);
    } catch {
      message.error("Не вдалося завантажити галерею");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleAdd = async () => {
    if (!addingUrl) return;
    try {
      await createGalleryImage({ imageUrl: addingUrl, isActive: true });
      setAddingUrl(null);
      message.success("Фото додано");
      fetchImages();
    } catch {
      message.error("Помилка додавання");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGalleryImage(id);
      message.success("Фото видалено");
      setImages((prev) => prev.filter((img) => img._id !== id));
    } catch {
      message.error("Помилка видалення");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateGalleryImage(id, { isActive });
      setImages((prev) =>
        prev.map((img) => (img._id === id ? { ...img, isActive } : img)),
      );
    } catch {
      message.error("Помилка оновлення");
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setImages(reordered);
    try {
      const ids = reordered.map((img) => img._id);
      await reorderGalleryImages(ids);
    } catch {
      message.error("Помилка зміни порядку");
      fetchImages();
    }
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}>
          <Title level={3} style={{ margin: 0 }}>
            {t("gallery.title")}
          </Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchImages}
            loading={loading}>
            {t("gallery.refresh")}
          </Button>
        </div>

        {/* Add new image */}
        <Card
          size="small"
          style={{ marginBottom: 24 }}
          title={t("gallery.addNew")}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <ImageUploader
              value={addingUrl}
              onChange={(url) => setAddingUrl(url)}
              folder="gallery"
            />
            {addingUrl && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}>
                {t("gallery.save")}
              </Button>
            )}
          </Space>
        </Card>

        {/* Image grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}>
          {images.map((img, index) => (
            <Card
              key={img._id}
              size="small"
              style={{
                opacity: img.isActive ? 1 : 0.5,
                border: img.isActive
                  ? "2px solid transparent"
                  : "2px dashed #d9d9d9",
              }}
              cover={
                <div
                  style={{
                    height: 200,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f5f5f5",
                  }}>
                  <Image
                    src={img.imageUrl}
                    alt={img.altI18n?.uk || "gallery"}
                    style={{
                      maxHeight: 200,
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                </div>
              }
              actions={[
                <ArrowUpOutlined
                  key="up"
                  onClick={() => handleMove(index, -1)}
                  style={{
                    color: index === 0 ? "#d9d9d9" : undefined,
                    cursor: index === 0 ? "not-allowed" : "pointer",
                  }}
                />,
                <ArrowDownOutlined
                  key="down"
                  onClick={() => handleMove(index, 1)}
                  style={{
                    color:
                      index === images.length - 1 ? "#d9d9d9" : undefined,
                    cursor:
                      index === images.length - 1 ? "not-allowed" : "pointer",
                  }}
                />,
                <Popconfirm
                  key="delete"
                  title={t("gallery.deleteConfirm")}
                  onConfirm={() => handleDelete(img._id)}
                  okText={t("gallery.yes")}
                  cancelText={t("gallery.no")}>
                  <DeleteOutlined style={{ color: "#ff4d4f" }} />
                </Popconfirm>,
              ]}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                <Text type="secondary">
                  #{index + 1}
                </Text>
                <Switch
                  size="small"
                  checked={img.isActive}
                  onChange={(checked) =>
                    handleToggleActive(img._id, checked)
                  }
                />
              </div>
            </Card>
          ))}
        </div>

        {images.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#999" }}>
            {t("gallery.empty")}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
