import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  message,
  theme as antdTheme,
} from "antd";
import axios from "axios";
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/AuthContext";
import { useI18n } from "../store/i18n";
import logoUrl from "../assets/orthilogotype.png";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { token } = antdTheme.useToken();
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
            : undefined) || t("login.error.credentials");
        message.error(serverMsg);
      } else {
        message.error(t("login.error.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  const [capsOn, setCapsOn] = useState(false);
  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // CapsLock detection, some browsers support getModifierState
    try {
      const isOn = e.getModifierState && e.getModifierState("CapsLock");
      setCapsOn(!!isOn);
    } catch {
      // ignore
    }
  };

  const gridSelector = useMemo(
    () => "div[style*='grid-template-columns: 1.2fr 1fr']",
    []
  );

  return (
    <div style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      {/* Language switcher */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: token.colorBgContainer,
          borderRadius: 999,
          padding: "6px 10px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
        <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
          {t("login.langSwitcher")}:
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["ru", "uk"] as const).map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                fontSize: 12,
                lineHeight: 1,
                padding: "6px 10px",
                borderRadius: 999,
                border:
                  "1px solid " +
                  (lang === code ? token.colorPrimary : token.colorBorder),
                background:
                  lang === code ? token.colorPrimary : token.colorBgElevated,
                color:
                  lang === code ? token.colorTextLightSolid : token.colorText,
                cursor: "pointer",
              }}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {/* Subtle grid background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(transparent 23px, " +
            token.colorBorder +
            " 24px), linear-gradient(90deg, transparent 23px, " +
            token.colorBorder +
            " 24px)",
          backgroundSize: "24px 24px",
          opacity: 0.25,
          pointerEvents: "none",
        }}
      />
      {/* Decorative blobs */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: token.colorPrimary,
            filter: "blur(80px)",
            opacity: 0.15,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: token.colorInfo,
            filter: "blur(90px)",
            opacity: 0.14,
          }}
        />
      </div>
      {/* Two-column responsive layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          minHeight: "100vh",
        }}>
        {/* Left hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}>
          <div style={{ maxWidth: 560 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 16,
              }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 16,
                  background: token.colorBgContainer,
                  display: "grid",
                  placeItems: "center",
                  boxShadow:
                    "inset 0 0 0 1px " +
                    token.colorBorder +
                    ", 0 10px 30px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}>
                <img
                  src={logoUrl}
                  alt="logo"
                  style={{
                    maxWidth: "90%",
                    maxHeight: "90%",
                    objectFit: "contain",
                    display: "block",
                    filter:
                      "drop-shadow(0 2px 4px rgba(0,0,0,0.12)) drop-shadow(0 8px 16px rgba(0,0,0,0.08))",
                  }}
                />
              </div>
              <div>
                <Typography.Title
                  level={2}
                  style={{ margin: 0 }}>
                  {t("layout.brand")}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {t("login.subtitle")}
                </Typography.Text>
              </div>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: token.colorSuccess,
                  }}
                />
                <Typography.Text>{t("login.feature.modern")}</Typography.Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: token.colorWarning,
                  }}
                />
                <Typography.Text>{t("login.feature.secure")}</Typography.Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: token.colorInfo,
                  }}
                />
                <Typography.Text>
                  {t("login.feature.bilingual")}
                </Typography.Text>
              </div>
            </div>
          </div>
        </div>
        {/* Right form */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}>
          <Card
            bordered={false}
            style={{
              width: 420,
              backdropFilter: "blur(8px)",
              background: token.colorBgContainer,
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              borderRadius: 16,
              transform: "translateY(0)",
              animation: "cardIn 400ms ease 60ms both",
            }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Typography.Title
                level={3}
                style={{ marginBottom: 4 }}>
                {t("login.title")}
              </Typography.Title>
            </div>
            <Form
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ username: "admin", password: "" }}>
              <Form.Item
                name="username"
                label={t("login.username")}
                rules={[
                  { required: true, message: t("login.username.required") },
                ]}>
                <Input
                  autoFocus
                  size="large"
                  placeholder="admin"
                />
              </Form.Item>
              <Form.Item
                name="password"
                label={t("login.password")}
                rules={[
                  { required: true, message: t("login.password.required") },
                ]}>
                <div>
                  <Input.Password
                    size="large"
                    onKeyUp={handleKeyEvent}
                    onKeyDown={handleKeyEvent}
                  />
                  {capsOn && (
                    <div
                      style={{
                        marginTop: 6,
                        color: token.colorWarning,
                        fontSize: 12,
                      }}>
                      {t("login.capsLockOn")}
                    </div>
                  )}
                </div>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}>
                  {t("login.signIn")}
                </Button>
              </Form.Item>
            </Form>
            <div
              style={{
                textAlign: "center",
                color: token.colorTextTertiary,
                fontSize: 12,
              }}>
              © {new Date().getFullYear()} {t("layout.brand")} · Admin
            </div>
          </Card>
        </div>
      </div>
      {/* Responsive: collapse to single column under 900px */}
      <style>{`
        @media (max-width: 900px) {
          ${gridSelector} { grid-template-columns: 1fr; }
          ${gridSelector} > :first-child { display: none; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
