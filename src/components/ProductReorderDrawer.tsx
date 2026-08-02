import { useCallback, useEffect, useRef, useState } from "react";
import {
  Drawer,
  Button,
  Space,
  App as AntApp,
  Spin,
  Empty,
  InputNumber,
  Typography,
  Image,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import {
  listProducts,
  reorderProducts,
  type Product,
} from "../api/products";
import { useI18n } from "../store/i18n";

type Props = {
  open: boolean;
  categoryId: string;
  categoryName?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductReorderDrawer({
  open,
  categoryId,
  categoryName,
  onClose,
  onSaved,
}: Props) {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const res = await listProducts({
        category: categoryId,
        page: 1,
        limit: 200,
        sort: "-createdAt",
      });
      const sorted = [...res.items].sort((a, b) => {
        const pa = a.categoryOrder?.[categoryId];
        const pb = b.categoryOrder?.[categoryId];
        // products with a position first (by position), the rest keep API order
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return 0;
      });
      setItems(sorted);
    } catch {
      void message.error(t("products.reorder.loadError"));
    } finally {
      setLoading(false);
    }
  }, [categoryId, message, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const move = (from: number, to: number) => {
    setItems((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await reorderProducts(
        categoryId,
        items.map((p) => p._id),
      );
      void message.success(t("products.reorder.saved"));
      onSaved();
      onClose();
    } catch {
      void message.error(t("products.reorder.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      width={560}
      onClose={onClose}
      title={`${t("products.reorder.title")}${categoryName ? ` — ${categoryName}` : ""}`}
      extra={
        <Space>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="primary"
            loading={saving}
            disabled={items.length === 0}
            onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </Space>
      }>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        {t("products.reorder.hint")}
      </Typography.Paragraph>

      {loading ? (
        <Spin style={{ display: "block", marginTop: 60, textAlign: "center" }} />
      ) : items.length === 0 ? (
        <Empty description={t("products.reorder.empty")} style={{ marginTop: 60 }} />
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={6}>
          {items.map((p, i) => (
            <div
              key={p._id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current != null) move(dragIndex.current, i);
                dragIndex.current = null;
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                background: "#fff",
                cursor: "grab",
              }}>
              <HolderOutlined style={{ color: "#bbb" }} />
              <InputNumber
                size="small"
                min={1}
                max={items.length}
                value={i + 1}
                style={{ width: 64 }}
                onChange={(val) => {
                  const to = (Number(val) || 1) - 1;
                  move(i, Math.max(0, Math.min(items.length - 1, to)));
                }}
              />
              {p.images?.[0] ? (
                <Image
                  src={p.images[0]}
                  width={36}
                  height={36}
                  style={{ objectFit: "contain", background: "#fafafa" }}
                  preview={false}
                />
              ) : (
                <div style={{ width: 36, height: 36, background: "#fafafa", borderRadius: 4 }} />
              )}
              <Typography.Text ellipsis style={{ flex: 1 }}>
                {p.title}
              </Typography.Text>
              <Space size={2}>
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                />
              </Space>
            </div>
          ))}
        </Space>
      )}
    </Drawer>
  );
}
