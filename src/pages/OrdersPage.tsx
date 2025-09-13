import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { listOrders, type ListOrdersResponse, type Order } from "../api/orders";
import { useQueryParam } from "../hooks/useQueryParam";
import { SnippetsOutlined } from "@ant-design/icons";
import { useI18n } from "../store/i18n";

const { RangePicker } = DatePicker;

export function OrdersPage() {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ListOrdersResponse | null>(null);

  // URL-persisted filters
  const [status, setStatus] = useQueryParam("status", "");
  const [phone, setPhone] = useQueryParam("phone", "");
  const [clientId, setClientId] = useQueryParam("clientId", "");
  const [from, setFrom] = useQueryParam("from", "");
  const [to, setTo] = useQueryParam("to", "");
  const [pageStr, setPageStr] = useQueryParam("page", "1");
  const [limitStr, setLimitStr] = useQueryParam("limit", "20");
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(limitStr || "20", 10) || 20)
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOrders({
        status: (status || undefined) as Order["status"] | undefined,
        phone: phone || undefined,
        clientId: clientId || undefined,
        createdFrom: from || undefined,
        createdTo: to || undefined,
        sort: "-createdAt",
        page,
        limit,
      });
      setData(res);
    } catch {
      message.error(t("orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, phone, clientId, from, to, page, limit, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "_id",
        key: "_id",
        width: 260,
        render: (id: string) => (
          <Typography.Text copyable={{ text: id }}>
            <Link to={`/orders/${id}`}>{id}</Link>
          </Typography.Text>
        ),
      },
      {
        title: t("orders.columns.phone"),
        dataIndex: "phone",
        key: "phone",
        width: 180,
        render: (p: string) => (
          <Typography.Text copyable={{ text: p }}>{p}</Typography.Text>
        ),
      },
      {
        title: t("orders.columns.clientId"),
        dataIndex: "clientId",
        key: "clientId",
        width: 160,
        render: (cid?: string) =>
          cid ? (
            <Typography.Text copyable={{ text: cid }}>{cid}</Typography.Text>
          ) : (
            "—"
          ),
      },
      {
        title: t("orders.columns.itemsCount"),
        key: "itemsCount",
        width: 120,
        render: (_: unknown, r: Order) => r.items?.length ?? 0,
      },
      {
        title: t("orders.columns.itemsTotal"),
        dataIndex: "itemsTotal",
        key: "itemsTotal",
        width: 140,
      },
      {
        title: t("orders.columns.total"),
        dataIndex: "total",
        key: "total",
        width: 120,
      },
      {
        title: t("orders.columns.status"),
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (s: Order["status"]) => {
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
        },
      },
      {
        title: t("orders.columns.createdAt"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 200,
        render: (v?: string | null) =>
          v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—",
      },
    ],
    [t]
  );

  const items = data?.items ?? [];

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        {/* Page title removed (shown in header) */}

        <Space wrap>
          <Select
            allowClear
            placeholder={t("orders.filters.status.placeholder")}
            style={{ width: 200 }}
            value={status || undefined}
            onChange={(v) => {
              setStatus(v ?? "");
              setPageStr("1");
            }}
            options={[
              { value: "new", label: t("order.status.new") },
              { value: "processing", label: t("order.status.processing") },
              { value: "done", label: t("order.status.done") },
              { value: "cancelled", label: t("order.status.cancelled") },
            ]}
          />
          <Input
            placeholder={t("orders.filters.phone.placeholder")}
            style={{ width: 220 }}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPageStr("1");
            }}
            onPressEnter={() => {
              setPageStr("1");
              void load();
            }}
            allowClear
          />
          <Space.Compact>
            <Input
              placeholder={t("orders.filters.client.placeholder")}
              style={{ width: 200 }}
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setPageStr("1");
              }}
              onPressEnter={() => {
                setPageStr("1");
                void load();
              }}
              allowClear
            />
            <Button
              icon={<SnippetsOutlined />}
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setClientId(text.trim());
                    setPageStr("1");
                    void load();
                  }
                } catch {
                  message.error(t("orders.clipboardError"));
                }
              }}
            />
          </Space.Compact>
          <RangePicker
            allowEmpty={[true, true]}
            value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
            onChange={(vals) => {
              const [f, t] = vals || [];
              setFrom(f ? f.toISOString() : "");
              setTo(t ? t.toISOString() : "");
              setPageStr("1");
            }}
            showTime
          />
          <Button
            onClick={() => {
              setStatus("new");
              setPageStr("1");
              void load();
            }}>
            {t("layout.button.new")}
          </Button>
          <Button
            onClick={() => {
              const start = dayjs().startOf("day");
              const end = dayjs().endOf("day");
              setFrom(start.toISOString());
              setTo(end.toISOString());
              setPageStr("1");
              void load();
            }}>
            {t("layout.button.today")}
          </Button>
          <Button
            type="primary"
            onClick={() => void load()}>
            {t("common.apply")}
          </Button>
        </Space>

        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (p, ps) => {
              setPageStr(String(p));
              setLimitStr(String(ps));
            },
            showTotal: (total, range) =>
              `${range[0]}–${range[1]} ${t("common.of")} ${total}`,
          }}
        />
      </Space>
    </AdminLayout>
  );
}
