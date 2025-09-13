import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Button, Drawer, Form, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  createAdminUser,
  fetchAdminUsers,
  type AdminUserListItem,
} from "../api/auth";
import { useI18n } from "../store/i18n";

export function AdminUsersPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminUserListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchAdminUsers();
      setData(items);
    } catch {
      message.error(t("admins.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo<ColumnsType<AdminUserListItem>>(
    () => [
      {
        title: t("admins.columns.username"),
        dataIndex: "username",
        key: "username",
      },
      {
        title: t("admins.columns.name"),
        dataIndex: "name",
        key: "name",
        render: (v) => (v as string | null) || "—",
      },
      {
        title: t("admins.columns.isActive"),
        dataIndex: "isActive",
        key: "isActive",
        render: (v) => ((v as boolean) ? t("common.yes") : t("common.no")),
        width: 120,
      },
    ],
    [t]
  );

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      await createAdminUser(values);
      message.success(t("admins.created"));
      setOpen(false);
      form.resetFields();
      load();
    } catch (e) {
      // валидационные ошибки формы — просто игнорируем здесь
      const maybeAxios = e as { response?: { data?: { message?: string } } };
      if (maybeAxios?.response?.data?.message) {
        message.error(maybeAxios.response.data.message);
      }
    }
  };

  return (
    <AdminLayout>
      <Space
        style={{
          width: "100%",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}>
        <Button
          type="primary"
          onClick={() => setOpen(true)}>
          {t("admins.createButton")}
        </Button>
      </Space>

      <Table
        rowKey={(r) => r.username}
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
      />

      <Drawer
        title={t("admins.drawer.title")}
        width={400}
        onClose={() => setOpen(false)}
        open={open}
        destroyOnClose
        footer={
          <Space
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: "100%",
            }}>
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              type="primary"
              onClick={onCreate}>
              {t("common.create")}
            </Button>
          </Space>
        }>
        <Form
          form={form}
          layout="vertical"
          preserve={false}>
          <Form.Item
            name="username"
            label={t("admins.form.username")}
            rules={[
              { required: true, message: t("admins.form.username.required") },
            ]}>
            <Input
              placeholder="admin"
              autoFocus
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("admins.form.password")}
            rules={[
              { required: true, message: t("admins.form.password.required") },
              { min: 6, message: t("admins.form.password.min6") },
            ]}>
            <Input.Password placeholder={t("admins.form.password") as string} />
          </Form.Item>
          <Form.Item
            name="name"
            label={t("admins.form.name")}>
            <Input placeholder={t("admins.form.name.optional") as string} />
          </Form.Item>
        </Form>
      </Drawer>
    </AdminLayout>
  );
}
