import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  App as AntApp,
  Button,
  Descriptions,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "../components/AdminLayout";
import { useI18n } from "../store/i18n";
import {
  getCustomer,
  getCustomerOrders,
  deleteCustomer,
  type CustomerDetail,
  type CustomerOrder,
  type ListCustomerOrdersResponse,
} from "../api/customers";

const { Title, Text } = Typography;

const uah = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  minimumFractionDigits: 0,
});

const statusColors: Record<string, string> = {
  new: "blue",
  processing: "orange",
  done: "green",
  cancelled: "red",
};

export function CustomerDetailsPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [ordersData, setOrdersData] =
    useState<ListCustomerOrdersResponse | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(20);

  /* Load customer */
  useEffect(() => {
    if (!id) return;
    setLoadingCustomer(true);
    getCustomer(id)
      .then(setCustomer)
      .catch(() => void message.error(t("customerDetails.loadError")))
      .finally(() => setLoadingCustomer(false));
  }, [id, message, t]);

  /* Load orders */
  const loadOrders = useCallback(async () => {
    if (!id) return;
    setLoadingOrders(true);
    try {
      const res = await getCustomerOrders(id, {
        page: ordersPage,
        limit: ordersLimit,
      });
      setOrdersData(res);
    } catch {
      void message.error(t("customerDetails.ordersLoadError"));
    } finally {
      setLoadingOrders(false);
    }
  }, [id, ordersPage, ordersLimit, message, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const onDeleteCustomer = useCallback(() => {
    if (!id || !customer) return;

    modal.confirm({
      title: t("customerDetails.delete.confirmTitle"),
      content: t("customerDetails.delete.confirmText"),
      okText: t("customerDetails.delete.confirmOk"),
      okType: "danger",
      cancelText: t("common.cancel"),
      async onOk() {
        setDeleting(true);
        try {
          await deleteCustomer(id);
          message.success(t("customerDetails.delete.success"));
          navigate("/customers");
        } catch {
          message.error(t("customerDetails.delete.error"));
        } finally {
          setDeleting(false);
        }
      },
    });
  }, [customer, id, message, modal, navigate, t]);

  /* Summary stats */
  const summary = useMemo(() => {
    if (!customer) return null;
    return {
      ordersCount: customer.ordersCount,
      ordersTotal: customer.ordersTotal,
    };
  }, [customer]);

  /* Orders table columns */
  const orderColumns: ColumnsType<CustomerOrder> = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
      width: 110,
      render: (val: string) => (
        <Link to={`/orders/${val}`}>
          <Text copyable={{ text: val }}>{val.slice(-6)}</Text>
        </Link>
      ),
    },
    {
      title: t("customerDetails.orders.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => (
        <Tag color={statusColors[s] ?? "default"}>{t(`order.status.${s}`)}</Tag>
      ),
    },
    {
      title: t("customerDetails.orders.items"),
      key: "itemsCount",
      width: 80,
      align: "right",
      render: (_: unknown, rec: CustomerOrder) =>
        Array.isArray(rec.items) ? rec.items.length : 0,
    },
    {
      title: t("customerDetails.orders.total"),
      dataIndex: "total",
      key: "total",
      width: 130,
      align: "right",
      render: (val: number) => uah.format(val),
    },
    {
      title: t("customerDetails.orders.createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (val: string | null) =>
        val
          ? new Date(val).toLocaleString("uk-UA", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    },
  ];

  if (loadingCustomer) {
    return (
      <AdminLayout>
        <Spin style={{ display: "block", margin: "80px auto" }} />
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <Text type="secondary">{t("customerDetails.notFound")}</Text>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}>
        <Title
          level={4}
          style={{ marginBottom: 0 }}>
          {customer.name || customer.phone}
        </Title>

        <Button
          danger
          loading={deleting}
          onClick={onDeleteCustomer}>
          {t("customerDetails.delete.button")}
        </Button>
      </div>

      <Descriptions
        bordered
        column={{ xs: 1, sm: 2 }}
        size="small"
        style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t("customerDetails.desc.phone")}>
          <Text copyable>{customer.phone}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.email")}>
          {customer.email || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.name")}>
          {customer.name || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.phoneVerified")}>
          {customer.isPhoneVerified ? (
            <Tag color="green">{t("customerDetails.yes")}</Tag>
          ) : (
            <Tag>{t("customerDetails.no")}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.marketing")}>
          {customer.marketingOptIn ? (
            <Tag color="green">{t("customerDetails.yes")}</Tag>
          ) : (
            <Tag>{t("customerDetails.no")}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.lastLogin")}>
          {customer.lastLoginAt
            ? new Date(customer.lastLoginAt).toLocaleString("uk-UA")
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.createdAt")}>
          {customer.createdAt
            ? new Date(customer.createdAt).toLocaleString("uk-UA")
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.ordersCount")}>
          <Tag color="blue">{summary?.ordersCount ?? 0}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t("customerDetails.desc.ordersTotal")}>
          {uah.format(summary?.ordersTotal ?? 0)}
        </Descriptions.Item>
      </Descriptions>

      <Title
        level={5}
        style={{ marginBottom: 12 }}>
        {t("customerDetails.ordersTitle")}
      </Title>

      <Table<CustomerOrder>
        rowKey="_id"
        dataSource={ordersData?.items ?? []}
        columns={orderColumns}
        loading={loadingOrders}
        pagination={{
          current: ordersPage,
          pageSize: ordersLimit,
          total: ordersData?.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          onChange: (p, ps) => {
            setOrdersPage(p);
            setOrdersLimit(ps);
          },
        }}
        scroll={{ x: 600 }}
        size="middle"
      />
    </AdminLayout>
  );
}
