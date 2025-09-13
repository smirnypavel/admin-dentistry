import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  App as AntApp,
  Button,
  Divider,
  Space,
  Table,
  Typography,
  ConfigProvider,
  theme as antdTheme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { getOrder, type Order, type OrderItemSnapshot } from "../api/orders";
import { useI18n } from "../store/i18n";

export default function OrderPrintPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp();
  const [order, setOrder] = useState<Order | null>(null);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getOrder(id);
        setOrder(data);
      } catch {
        message.error(t("orderDetails.loadError"));
      }
    };
    void load();
  }, [id, message, t]);

  const columns: ColumnsType<OrderItemSnapshot> = [
    { title: "SKU", dataIndex: "sku", key: "sku", width: 120 },
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
      width: 160,
      render: (_: unknown, r) => fmt.format(r.price),
    },
    {
      title: t("orderDetails.table.subtotal"),
      key: "subtotal",
      width: 180,
      render: (_: unknown, r) => fmt.format(r.price * r.quantity),
    },
  ];

  const summary = useMemo(() => {
    if (!order) return null as null | { items: number; total: number };
    const items = order.items.reduce((sum, it) => sum + it.quantity, 0);
    return { items, total: order.total };
  }, [order]);

  return (
    <ConfigProvider
      theme={{
        // Force light theme regardless of global app theme
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorBgBase: "#ffffff",
          colorBgLayout: "#ffffff",
          colorBgContainer: "#ffffff",
          colorTextBase: "#000000",
          colorBorder: "#e5e7eb",
        },
        components: {
          Layout: {
            bodyBg: "#ffffff",
            headerBg: "#ffffff",
            footerBg: "#ffffff",
            siderBg: "#ffffff",
          },
          Table: {
            headerBg: "#fafafa",
            headerColor: "#000000",
            rowHoverBg: "rgba(0,0,0,0.03)",
          },
        },
      }}>
      <div
        style={{
          padding: 24,
          background: "white",
          color: "#000",
          minHeight: "100vh",
        }}>
        <style>{`
          /* Ensure the whole page (including parent Layout) is white */
          html, body, #root, .ant-layout {
            background: #ffffff !important;
          }
        @media print {
          .no-print { display: none !important; }
          html, body, #root, .ant-layout { background: #ffffff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #000000 !important; }
        }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .meta { margin-top: 8px; color: rgba(0,0,0,0.65); }
      `}</style>

        <div className="header">
          <Typography.Title
            level={3}
            style={{ margin: 0 }}>
            {t("layout.brand")} · {t("layout.menu.orders")}
          </Typography.Title>
          <Button
            className="no-print"
            type="primary"
            onClick={() => window.print()}>
            {t("orderDetails.btn.print")}
          </Button>
        </div>

        <div className="meta">
          <div>ID: {order?._id ?? id}</div>
          <div>
            {t("orderDetails.desc.createdAt")}:{" "}
            {order?.createdAt
              ? dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")
              : "—"}
          </div>
          <div>
            {t("orderDetails.desc.buyer")}: {order?.name || "—"}
          </div>
          <div>
            {t("orderDetails.desc.phone")}: {order?.phone || "—"}
          </div>
        </div>

        <Divider />

        <Typography.Title
          level={5}
          style={{ marginTop: 0 }}>
          {t("orderDetails.itemsTitle")}
        </Typography.Title>
        <Table
          rowKey={(r) => `${r.productId}-${r.sku}`}
          columns={columns}
          dataSource={order?.items || []}
          pagination={false}
          size="small"
        />

        <Divider />

        <Space direction="vertical">
          <Typography.Text>
            {t("orderDetails.desc.itemsCount")}: {summary?.items ?? 0}
          </Typography.Text>
          <Typography.Title
            level={4}
            style={{ margin: 0 }}>
            {t("orderDetails.desc.totalToPay")}:{" "}
            {fmt.format(summary?.total ?? 0)}
          </Typography.Title>
        </Space>
      </div>
    </ConfigProvider>
  );
}
