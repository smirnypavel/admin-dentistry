import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  Descriptions,
  Divider,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  getOrder,
  updateOrderStatus,
  type Order,
  type OrderItemSnapshot,
} from "../api/orders";
import { useI18n } from "../store/i18n";

export function OrderDetailsPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { message, modal } = AntApp.useApp();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [, setLoading] = useState(false);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
      }),
    []
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch {
      message.error(t("orderDetails.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onChangeStatus = (next: Order["status"]) => {
    if (!order) return;
    const map: Record<Order["status"], string> = {
      new: t("order.status.new"),
      processing: t("order.status.processing"),
      done: t("order.status.done"),
      cancelled: t("order.status.cancelled"),
    };
    modal.confirm({
      title: `${t("orderDetails.changeStatusTo")} «${map[next]}»?`,
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      async onOk() {
        try {
          const updated = await updateOrderStatus(order._id, next);
          if (updated) setOrder(updated);
          message.success(t("orderDetails.statusUpdated"));
        } catch {
          message.error(t("orderDetails.statusUpdateError"));
        }
      },
    });
  };

  const itemColumns: ColumnsType<OrderItemSnapshot> = [
    { title: "SKU", dataIndex: "sku", key: "sku", width: 140 },
    { title: t("orderDetails.table.title"), dataIndex: "title", key: "title" },
    {
      title: t("orderDetails.table.quantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
    },
    {
      title: t("orderDetails.table.price"),
      key: "price",
      width: 200,
      render: (_: unknown, r) => (
        <Space
          size={4}
          direction="vertical">
          <span>
            <Typography.Text
              type={
                r.priceOriginal && r.priceOriginal !== r.price
                  ? "secondary"
                  : undefined
              }
              delete={!!r.priceOriginal && r.priceOriginal !== r.price}>
              {fmt.format(r.priceOriginal ?? r.price)}
            </Typography.Text>
          </span>
          {r.priceOriginal && r.priceOriginal !== r.price ? (
            <Typography.Text strong>{fmt.format(r.price)}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: t("orderDetails.table.subtotal"),
      key: "subtotal",
      width: 200,
      render: (_: unknown, r) => {
        const orig = (r.priceOriginal ?? r.price) * r.quantity;
        const fin = r.price * r.quantity;
        const discounted = !!r.priceOriginal && r.priceOriginal !== r.price;
        return (
          <Space
            size={4}
            direction="vertical">
            <span>
              <Typography.Text
                type={discounted ? "secondary" : undefined}
                delete={discounted}>
                {fmt.format(orig)}
              </Typography.Text>
            </span>
            {discounted ? (
              <Typography.Text strong>{fmt.format(fin)}</Typography.Text>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: t("orderDetails.table.discounts"),
      key: "discounts",
      render: (_: unknown, r) => (
        <Space
          size={4}
          wrap>
          {(r.discountsApplied || []).map((d) => {
            const label = `${d.name}: ${d.type === "percent" ? `${d.value}%` : `-${fmt.format(d.value)}`}`;
            const hint = `${t("orderDetails.discount.hint.before")}: ${fmt.format(d.priceBefore)} → ${t("orderDetails.discount.hint.after")}: ${fmt.format(d.priceAfter)}`;
            return (
              <Tag
                key={`${d.discountId}-${d.value}`}
                title={hint}>
                {label}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: t("orderDetails.item.options"),
      dataIndex: "options",
      key: "options",
      render: (opts: Record<string, string | number>) => (
        <Space
          size={4}
          wrap>
          {Object.entries(opts || {}).map(([k, v]) => (
            <Tag key={k}>{`${k}: ${v}`}</Tag>
          ))}
        </Space>
      ),
    },
  ];

  const statusTag = (s: Order["status"]) => {
    const color =
      s === "new"
        ? "processing"
        : s === "processing"
          ? "warning"
          : s === "done"
            ? "success"
            : "error";
    const label =
      s === "new"
        ? t("order.status.new")
        : s === "processing"
          ? t("order.status.processing")
          : s === "done"
            ? t("order.status.done")
            : t("order.status.cancelled");
    return <Tag color={color}>{label}</Tag>;
  };

  const summary = useMemo(() => {
    if (!order)
      return null as {
        itemsFinal: number;
        itemsOriginal: number;
        discountTotal: number;
      } | null;
    const itemsFinal = order.items.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
    const itemsOriginal = order.items.reduce(
      (sum, it) => sum + (it.priceOriginal ?? it.price) * it.quantity,
      0
    );
    const discountTotal = Math.max(0, itemsOriginal - itemsFinal);
    return { itemsFinal, itemsOriginal, discountTotal };
  }, [order]);

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Typography.Text
            type="secondary"
            copyable={order?._id ? { text: order._id } : undefined}>
            {order?._id ?? id ?? ""}
          </Typography.Text>
          <Space>
            {order ? (
              <Button
                onClick={() =>
                  window.open(`/orders/${order._id}/print`, "_blank")
                }
                type="default">
                {t("orderDetails.btn.print")}
              </Button>
            ) : null}
            <Button onClick={() => navigate(-1)}>{t("common.back")}</Button>
          </Space>
        </Space>

        {order ? (
          <>
            <Descriptions
              bordered
              column={2}
              size="middle"
              style={{ marginBottom: 16 }}>
              <Descriptions.Item
                label={t("orderDetails.desc.status")}
                span={2}>
                {statusTag(order.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.phone")}>
                <Typography.Text copyable={{ text: order.phone }}>
                  {order.phone}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.buyer")}>
                {order.name || "—"}
              </Descriptions.Item>
              <Descriptions.Item
                label={t("orderDetails.desc.comment")}
                span={2}>
                {order.comment || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.createdAt")}>
                {order.createdAt
                  ? dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.updatedAt")}>
                {order.updatedAt
                  ? dayjs(order.updatedAt).format("YYYY-MM-DD HH:mm")
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.itemsCount")}>
                {order.items?.length ?? 0}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.itemsSumBefore")}>
                {summary ? fmt.format(summary.itemsOriginal) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.itemsDiscount")}>
                {summary ? (
                  <Typography.Text type="success">
                    -{fmt.format(summary.discountTotal)}
                  </Typography.Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.itemsSumAfter")}>
                {summary ? fmt.format(summary.itemsFinal) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("orderDetails.desc.deliveryFee")}>
                {fmt.format(order.deliveryFee ?? 0)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t("orderDetails.desc.totalToPay")}
                span={2}>
                <Typography.Text strong>
                  {fmt.format(order.total)}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>

            <Space>
              <Button
                onClick={() => onChangeStatus("processing")}
                disabled={order.status !== "new"}>
                {t("orderDetails.btn.accept")}
              </Button>
              <Button
                onClick={() => onChangeStatus("done")}
                disabled={order.status !== "processing"}
                type="primary">
                {t("orderDetails.btn.finish")}
              </Button>
              <Button
                danger
                onClick={() => onChangeStatus("cancelled")}
                disabled={order.status === "done"}>
                {t("orderDetails.btn.cancel")}
              </Button>
            </Space>

            <Divider />
            <Typography.Title level={4}>
              {t("orderDetails.itemsTitle")}
            </Typography.Title>
            <Table
              rowKey={(r) => `${r.productId}-${r.sku}`}
              columns={itemColumns}
              dataSource={order.items}
              pagination={false}
            />
          </>
        ) : (
          <Typography.Text type="secondary">
            {t("common.loading")}
          </Typography.Text>
        )}
      </Space>
    </AdminLayout>
  );
}
