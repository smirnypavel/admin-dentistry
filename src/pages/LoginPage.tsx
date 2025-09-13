import { Button, Card, Form, Input, Typography, message } from "antd";
import axios from "axios";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/AuthContext";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || "/";

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await api.post("/admin/auth/login", values);
      setToken(data.accessToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMsg =
          (typeof err.response?.data === "object" &&
          err.response?.data &&
          "message" in err.response.data
            ? (err.response?.data as { message?: string }).message
            : undefined) || "Login failed. Please check credentials.";
        message.error(serverMsg);
      } else {
        message.error("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <Card style={{ width: 360 }}>
        <Typography.Title
          level={4}
          style={{ textAlign: "center" }}>
          Admin Login
        </Typography.Title>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ username: "admin", password: "" }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Enter username" }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Enter password" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
