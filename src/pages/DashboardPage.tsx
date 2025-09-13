import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { Line } from "@ant-design/plots";
import {
  getDashboard,
  type DashboardRecentOrder,
  type DashboardTopProduct,
  type GetDashboardResponse,
} from "../api/dashboard";
import { useQueryParam } from "../hooks/useQueryParam";
import { useI18n } from "../store/i18n";

const { RangePicker } = DatePicker;

export function DashboardPage() {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GetDashboardResponse | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Query-synced filters
  const [granularity, setGranularity] = useQueryParam("granularity", "day");
  const [tz, setTz] = useQueryParam("tz", "UTC");
  const [fromQ, setFromQ] = useQueryParam("from", "");
  const [toQ, setToQ] = useQueryParam("to", "");

  const from = useMemo(
    () => (fromQ ? dayjs(fromQ) : dayjs().subtract(30, "day")),
    [fromQ]
  );
  const to = useMemo(() => (toQ ? dayjs(toQ) : dayjs()), [toQ]);

  const applyPreset = (preset: "today" | "7d" | "30d" | "thisMonth") => {
    const now = dayjs();
    if (preset === "today") {
      setFromQ(now.startOf("day").toISOString());
      setToQ(now.endOf("day").toISOString());
    } else if (preset === "7d") {
      setFromQ(now.subtract(7, "day").toISOString());
      setToQ(now.toISOString());
    } else if (preset === "30d") {
      setFromQ(now.subtract(30, "day").toISOString());
      setToQ(now.toISOString());
    } else if (preset === "thisMonth") {
      setFromQ(now.startOf("month").toISOString());
      setToQ(now.endOf("month").toISOString());
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboard({
        from: from.toISOString(),
        to: to.toISOString(),
        granularity: (granularity as "day" | "week" | "month") || "day",
        tz: tz || "UTC",
        topLimit: 10,
        recentLimit: 10,
      });
      setData(res);
    } catch {
      message.error(t("dashboard.loadError"));
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [from, to, granularity, tz, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const topColumns: ColumnsType<DashboardTopProduct> = [
    {
      title: t("dashboard.top.columns.product"),
      dataIndex: "title",
      key: "title",
    },
    {
      title: t("dashboard.top.columns.quantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
    },
    {
      title: t("dashboard.top.columns.revenue"),
      dataIndex: "revenue",
      key: "revenue",
      width: 140,
    },
  ];

  const ordersColumns: ColumnsType<DashboardRecentOrder> = [
    { title: "ID", dataIndex: "_id", key: "_id", width: 220 },
    {
      title: t("dashboard.recent.columns.client"),
      key: "client",
      render: (_, r) => r.phone || r.clientId || "—",
    },
    {
      title: t("dashboard.recent.columns.items"),
      dataIndex: "itemsCount",
      key: "itemsCount",
      width: 100,
    },
    {
      title: t("dashboard.recent.columns.total"),
      dataIndex: "total",
      key: "total",
      width: 120,
    },
    {
      title: t("dashboard.recent.columns.status"),
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (s: string) => (
        <Tag
          color={
            s === "new"
              ? "processing"
              : s === "processing"
                ? "warning"
                : s === "cancelled"
                  ? "error"
                  : "success"
          }>
          {s === "new"
            ? t("order.status.new")
            : s === "processing"
              ? t("order.status.processing")
              : s === "cancelled"
                ? t("order.status.cancelled")
                : t("order.status.done")}
        </Tag>
      ),
    },
    {
      title: t("dashboard.recent.columns.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
  ];

  const onRangeChange = (vals: null | [Dayjs | null, Dayjs | null]) => {
    if (!vals || !vals[0] || !vals[1]) {
      setFromQ("");
      setToQ("");
      return;
    }
    setFromQ(vals[0].toISOString());
    setToQ(vals[1].toISOString());
  };

  // Keep UI steady while updating: use skeletons only on first load
  const initialLoading = !hasLoaded && loading;

  // Chart metric control and formatting
  const [chartMetric, setChartMetric] = useState<
    "revenue" | "orders" | "items"
  >("revenue");
  const chartData = useMemo(
    () =>
      (data?.salesSeries || []).map((p) => ({
        date: dayjs(p.periodStart).format("YYYY-MM-DD"),
        revenue: p.revenue,
        orders: p.orders,
        items: p.itemsSold,
      })),
    [data]
  );
  const yField =
    chartMetric === "revenue"
      ? "revenue"
      : chartMetric === "orders"
        ? "orders"
        : "items";
  const formatMoney = (n: number) => `₴${n.toLocaleString("uk-UA")}`;
  const formatAxis = (v: number | string) =>
    chartMetric === "revenue"
      ? typeof v === "number"
        ? v.toLocaleString("uk-UA")
        : String(v)
      : String(v);
  const tooltipFormatter = (d: {
    revenue?: number;
    orders?: number;
    items?: number;
  }) =>
    chartMetric === "revenue"
      ? {
          name: t("dashboard.metric.revenue"),
          value: formatMoney(Number(d.revenue || 0)),
        }
      : chartMetric === "orders"
        ? { name: t("dashboard.metric.orders"), value: String(d.orders || 0) }
        : { name: t("dashboard.metric.items"), value: String(d.items || 0) };

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        size="large"
        style={{ width: "100%" }}>
        {/* Filters */}
        <Space wrap>
          <RangePicker
            value={[from, to]}
            onChange={onRangeChange}
            allowClear
          />
          <Space size={4}>
            <Tag
              onClick={() => applyPreset("today")}
              color="processing"
              style={{ cursor: "pointer" }}>
              {t("dashboard.filters.today")}
            </Tag>
            <Tag
              onClick={() => applyPreset("7d")}
              style={{ cursor: "pointer" }}>
              {t("dashboard.filters.7d")}
            </Tag>
            <Tag
              onClick={() => applyPreset("30d")}
              style={{ cursor: "pointer" }}>
              {t("dashboard.filters.30d")}
            </Tag>
            <Tag
              onClick={() => applyPreset("thisMonth")}
              style={{ cursor: "pointer" }}>
              {t("dashboard.filters.thisMonth")}
            </Tag>
          </Space>
          <Select
            value={granularity || "day"}
            style={{ width: 180 }}
            onChange={(v) => setGranularity(v || "day")}
            allowClear
            options={[
              { value: "day", label: t("dashboard.filters.granularity.day") },
              { value: "week", label: t("dashboard.filters.granularity.week") },
              {
                value: "month",
                label: t("dashboard.filters.granularity.month"),
              },
            ]}
          />
          <Select
            value={chartMetric}
            style={{ width: 180 }}
            onChange={(v: "revenue" | "orders" | "items" | null) =>
              setChartMetric(v || "revenue")
            }
            options={[
              { value: "revenue", label: t("dashboard.metric.revenue") },
              { value: "orders", label: t("dashboard.metric.orders") },
              { value: "items", label: t("dashboard.metric.items") },
            ]}
          />
          <Select
            value={tz || "UTC"}
            style={{ width: 240 }}
            onChange={(v) => setTz(v || "UTC")}
            options={[
              { value: "UTC", label: "UTC" },
              { value: "Europe/Kyiv", label: "Europe/Kyiv" },
            ]}
            showSearch
          />
          {loading && hasLoaded ? (
            <Tag color="processing">{t("common.updating")}</Tag>
          ) : null}
        </Space>

        {/* Summary */}
        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            sm={12}
            md={6}>
            <Card loading={initialLoading}>
              <Statistic
                title={t("dashboard.summary.ordersAll")}
                value={data?.summary.ordersTotal ?? 0}
              />
            </Card>
          </Col>
          <Col
            xs={24}
            sm={12}
            md={6}>
            <Card loading={initialLoading}>
              <Statistic
                title={t("dashboard.summary.ordersCounted")}
                value={data?.summary.ordersNonCancelled ?? 0}
              />
            </Card>
          </Col>
          <Col
            xs={24}
            sm={12}
            md={6}>
            <Card loading={initialLoading}>
              <Statistic
                title={t("dashboard.summary.revenue")}
                value={data?.summary.revenue ?? 0}
                prefix="₴"
              />
            </Card>
          </Col>
          <Col
            xs={24}
            sm={12}
            md={6}>
            <Card loading={initialLoading}>
              <Statistic
                title={t("dashboard.summary.avgOrder")}
                value={data?.summary.avgOrderValue ?? 0}
                prefix="₴"
                precision={2}
              />
            </Card>
          </Col>
        </Row>

        <Card loading={initialLoading}>
          <Typography.Text type="secondary">
            {t("dashboard.salesDynamics")} (
            {chartMetric === "revenue"
              ? "₴"
              : chartMetric === "orders"
                ? t("dashboard.metric.orders")
                : t("dashboard.metric.items")}
            )
          </Typography.Text>
          <div style={{ height: 280, marginTop: 8 }}>
            <Line
              data={chartData}
              xField="date"
              yField={yField}
              smooth
              point={{ size: 3, shape: "circle" }}
              animation={false}
              tooltip={{
                formatter: ((d: unknown) => {
                  const dd = d as {
                    revenue?: number;
                    orders?: number;
                    items?: number;
                  };
                  const f = tooltipFormatter(dd);
                  const name =
                    chartMetric === "revenue"
                      ? t("dashboard.metric.revenue")
                      : chartMetric === "orders"
                        ? t("dashboard.metric.orders")
                        : t("dashboard.metric.items");
                  return { name, value: f.value } as {
                    name: string;
                    value: string;
                  };
                }) as (d: unknown) => { name: string; value: string },
              }}
              axis={{
                y: { labelFormatter: (v: number | string) => formatAxis(v) },
              }}
              interactions={[{ type: "element-highlight" }]}
            />
          </div>
          <div style={{ maxHeight: 160, overflow: "auto", marginTop: 8 }}>
            {data?.salesSeries?.map((p) => (
              <div
                key={p.periodStart}
                style={{ display: "flex", gap: 16 }}>
                <span style={{ width: 180 }}>
                  {dayjs(p.periodStart).format("YYYY-MM-DD")}
                </span>
                <span>
                  {t("dashboard.metric.orders")}: {p.orders}
                </span>
                <span>
                  {t("dashboard.metric.revenue")}: {formatMoney(p.revenue)}
                </span>
                <span>
                  {t("dashboard.metric.items")}: {p.itemsSold}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            md={12}>
            <Card
              title={t("dashboard.cards.topProducts")}
              loading={initialLoading}>
              <Table
                size="small"
                rowKey={(r) => `${r.productId}-${r.title}`}
                columns={topColumns}
                dataSource={data?.topProducts || []}
                pagination={false}
              />
            </Card>
          </Col>
          <Col
            xs={24}
            md={12}>
            <Card
              title={t("dashboard.cards.recentOrders")}
              loading={initialLoading}>
              <Table
                size="small"
                rowKey="_id"
                columns={ordersColumns}
                dataSource={data?.recentOrders || []}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col
            xs={24}
            md={12}>
            <Card title={t("dashboard.cards.catalog")}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.catalog.productsTotal")}
                    value={data?.catalogHealth.productsTotal ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.catalog.active")}
                    value={data?.catalogHealth.productsActive ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.catalog.variants")}
                    value={data?.catalogHealth.variantsTotal ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.catalog.withImages")}
                    value={data?.catalogHealth.productsWithImages ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.catalog.withoutImages")}
                    value={data?.catalogHealth.productsWithoutImages ?? 0}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col
            xs={24}
            md={12}>
            <Card title={t("dashboard.cards.discounts")}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.discounts.total")}
                    value={data?.discountsHealth.total ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.discounts.active")}
                    value={data?.discountsHealth.activeNow ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.discounts.upcoming")}
                    value={data?.discountsHealth.upcoming ?? 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={t("dashboard.discounts.expired")}
                    value={data?.discountsHealth.expired ?? 0}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Space>
    </AdminLayout>
  );
}
