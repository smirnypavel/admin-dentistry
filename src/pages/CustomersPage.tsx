import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App as AntApp, Input, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "../components/AdminLayout";
import { useI18n } from "../store/i18n";
import { useQueryParam } from "../hooks/useQueryParam";
import {
  listCustomers,
  type CustomerListItem,
  type ListCustomersResponse,
} from "../api/customers";

const { Text } = Typography;

const uah = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  minimumFractionDigits: 0,
});

export function CustomersPage() {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [search, setSearch] = useQueryParam("search", "", 400);
  const [page, setPage] = useQueryParam("page", "1", 0);
  const [limit, setLimit] = useQueryParam("limit", "20", 0);

  const [data, setData] = useState<ListCustomersResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCustomers({
        search: search || undefined,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sort: "-createdAt",
      });
      setData(res);
    } catch {
      void message.error(t("customers.loadError"));
    } finally {
      setLoading(false);
    }
  }, [search, page, limit, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<CustomerListItem> = [
    {
      title: t("customers.columns.name"),
      dataIndex: "name",
      key: "name",
      render: (name: string | null, rec) => (
        <Link to={`/customers/${rec._id}`}>
          {name || <Text type="secondary">—</Text>}
        </Link>
      ),
    },
    {
      title: t("customers.columns.phone"),
      dataIndex: "phone",
      key: "phone",
      render: (val: string) => <Text copyable={{ text: val }}>{val}</Text>,
    },
    {
      title: t("customers.columns.email"),
      dataIndex: "email",
      key: "email",
      render: (val: string | null) => val || "—",
    },
    {
      title: t("customers.columns.ordersCount"),
      dataIndex: "ordersCount",
      key: "ordersCount",
      align: "right",
      width: 100,
      render: (val: number) =>
        val > 0 ? (
          <Tag color="blue">{val}</Tag>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
    {
      title: t("customers.columns.ordersTotal"),
      dataIndex: "ordersTotal",
      key: "ordersTotal",
      align: "right",
      width: 140,
      render: (val: number) => (val > 0 ? uah.format(val) : "—"),
    },
    {
      title: t("customers.columns.lastLogin"),
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 160,
      render: (val: string | null) =>
        val ? new Date(val).toLocaleDateString("uk-UA") : "—",
    },
    {
      title: t("customers.columns.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (val: string | null) =>
        val ? new Date(val).toLocaleDateString("uk-UA") : "—",
    },
  ];

  return (
    <AdminLayout>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
        <Input.Search
          placeholder={t("customers.search.placeholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage("1");
          }}
          allowClear
          style={{ maxWidth: 360 }}
        />
      </div>

      <Table<CustomerListItem>
        rowKey="_id"
        dataSource={data?.items ?? []}
        columns={columns}
        loading={loading}
        pagination={{
          current: Number(page) || 1,
          pageSize: Number(limit) || 20,
          total: data?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (p, ps) => {
            setPage(String(p));
            setLimit(String(ps));
          },
        }}
        scroll={{ x: 900 }}
        size="middle"
      />
    </AdminLayout>
  );
}
