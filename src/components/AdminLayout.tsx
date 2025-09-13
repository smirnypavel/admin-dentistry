import {
  Avatar,
  Breadcrumb,
  Divider,
  Dropdown,
  Input,
  Layout,
  Menu,
  Select,
  Space,
  Tooltip,
  Button,
  Tag,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { listOrders } from "../api/orders";
import { useThemeMode } from "../store/themeContext";
import { theme as antdTheme, Segmented } from "antd";
import { useI18n } from "../store/i18n";
import { SunOutlined, MoonOutlined, DesktopOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { token } = antdTheme.useToken();
  const { mode, setMode } = useThemeMode();
  const { lang, setLang, t } = useI18n();
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const isDarkEffective = mode === "dark" || (mode === "system" && systemDark);
  const rootSeg = `/${(location.pathname.split("/")[1] || "").trim()}`;
  const selectedKey = rootSeg === "/" ? "/" : rootSeg;
  const [isMobile, setIsMobile] = useState(false);
  const siderWidth = 200;
  const [searchType, setSearchType] = useState<
    "product" | "ordersPhone" | "orderId"
  >("product");
  const [searchValue, setSearchValue] = useState("");
  const [ordersNew, setOrdersNew] = useState<number>(0);
  const [ordersProcessing, setOrdersProcessing] = useState<number>(0);
  const [ordersToday, setOrdersToday] = useState<number>(0);

  const breadcrumbItems = useMemo(() => {
    const segs = location.pathname.split("/").filter(Boolean);
    const nameMap: Record<string, string> = {
      "": t("layout.menu.dashboard"),
      products: t("layout.menu.products"),
      orders: t("layout.menu.orders"),
      discounts: t("layout.menu.discounts"),
      categories: t("layout.menu.categories"),
      manufacturers: t("layout.menu.manufacturers"),
      countries: t("layout.menu.countries"),
      admins: t("layout.menu.admins"),
    };
    const items = [] as { title: React.ReactNode; href?: string }[];
    if (segs.length === 0) {
      items.push({ title: nameMap[""] });
      return items;
    }
    let acc = "";
    segs.forEach((s, i) => {
      acc += `/${s}`;
      const isLast = i === segs.length - 1;
      const title =
        i === 1 && segs[0] === "orders"
          ? (t("layout.menu.orders") as React.ReactNode)
          : (nameMap[s] ?? s);
      items.push({ title, href: isLast ? undefined : acc });
    });
    return items;
  }, [location.pathname, t]);

  const userMenu: MenuProps["items"] = [
    {
      key: "logout",
      label: t("layout.user.logout"),
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  // Poll orders counters every 3 minutes
  useEffect(() => {
    let mounted = true;
    const fetchCounts = async () => {
      try {
        const startOfDay = dayjs().startOf("day").toISOString();
        const [newRes, procRes, todayRes] = await Promise.all([
          listOrders({ status: "new", page: 1, limit: 1 }),
          listOrders({ status: "processing", page: 1, limit: 1 }),
          listOrders({ createdFrom: startOfDay, page: 1, limit: 1 }),
        ]);
        if (!mounted) return;
        setOrdersNew(newRes.total || 0);
        setOrdersProcessing(procRes.total || 0);
        setOrdersToday(todayRes.total || 0);
      } catch {
        // silent fail
      }
    };
    void fetchCounts();
    const id = setInterval(fetchCounts, 3 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        width={siderWidth}
        collapsedWidth={0}
        onBreakpoint={(broken) => setIsMobile(broken)}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          height: "100vh",
          overflow: "auto",
          background: token.colorBgContainer,
        }}>
        <div style={{ color: token.colorText, padding: 16, fontWeight: 600 }}>
          {t("layout.brand")}
        </div>
        <Menu
          theme={isDarkEffective ? "dark" : "light"}
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ background: "transparent" }}
          items={[
            {
              key: "/",
              label: <Link to="/">{t("layout.menu.dashboard")}</Link>,
            },
            {
              key: "/products",
              label: <Link to="/products">{t("layout.menu.products")}</Link>,
            },
            {
              key: "/orders",
              label: <Link to="/orders">{t("layout.menu.orders")}</Link>,
            },
            {
              key: "/discounts",
              label: <Link to="/discounts">{t("layout.menu.discounts")}</Link>,
            },
            {
              key: "/categories",
              label: (
                <Link to="/categories">{t("layout.menu.categories")}</Link>
              ),
            },
            {
              key: "/manufacturers",
              label: (
                <Link to="/manufacturers">
                  {t("layout.menu.manufacturers")}
                </Link>
              ),
            },
            {
              key: "/countries",
              label: <Link to="/countries">{t("layout.menu.countries")}</Link>,
            },
            {
              key: "/admins",
              label: <Link to="/admins">{t("layout.menu.admins")}</Link>,
            },
          ]}
        />
      </Sider>
      <Layout style={{ marginLeft: isMobile ? 0 : siderWidth }}>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 16px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
            height: 64,
            lineHeight: "64px",
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderBottom: `1px solid ${token.colorBorder}`,
          }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              flex: "1 1 auto",
              overflow: "hidden",
            }}>
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: "1 1 auto",
              minWidth: 0,
              flexWrap: "nowrap",
            }}>
            <Select
              size="middle"
              value={searchType}
              style={{ width: 160, flex: "0 0 auto" }}
              onChange={(v) => setSearchType(v)}
              options={[
                { value: "product", label: t("layout.search.products.label") },
                {
                  value: "ordersPhone",
                  label: t("layout.search.ordersPhone.label"),
                },
                { value: "orderId", label: t("layout.search.orderId.label") },
              ]}
            />
            <Input.Search
              allowClear
              placeholder={
                searchType === "product"
                  ? t("layout.search.products")
                  : searchType === "ordersPhone"
                    ? t("layout.search.ordersPhone")
                    : t("layout.search.orderId")
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={(val) => {
                if (!val.trim()) return;
                if (searchType === "product")
                  navigate(`/products?q=${encodeURIComponent(val.trim())}`);
                else if (searchType === "ordersPhone")
                  navigate(`/orders?phone=${encodeURIComponent(val.trim())}`);
                else navigate(`/orders/${encodeURIComponent(val.trim())}`);
              }}
              style={{ flex: "1 1 280px", minWidth: 120, maxWidth: 480 }}
            />
            <Divider
              type="vertical"
              style={{ height: 24, marginInline: 8, flex: "0 0 auto" }}
            />
            <Space
              size={8}
              wrap={false}
              style={{ flex: "0 0 auto" }}>
              <Tooltip title={t("layout.tooltip.newOrders")}>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <Button
                    size="small"
                    onClick={() => navigate("/orders?status=new")}>
                    {t("layout.button.new")}
                  </Button>
                  {ordersNew > 0 && (
                    <Tag
                      color="processing"
                      style={{ marginInlineStart: 4 }}>
                      {ordersNew}
                    </Tag>
                  )}
                </span>
              </Tooltip>
              <Tooltip title={t("layout.tooltip.processingOrders")}>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <Button
                    size="small"
                    onClick={() => navigate("/orders?status=processing")}>
                    {t("layout.button.processing")}
                  </Button>
                  {ordersProcessing > 0 && (
                    <Tag
                      color="warning"
                      style={{ marginInlineStart: 4 }}>
                      {ordersProcessing}
                    </Tag>
                  )}
                </span>
              </Tooltip>
              <Tooltip title={t("layout.tooltip.todayOrders")}>
                <span style={{ display: "inline-flex", alignItems: "center" }}>
                  <Button
                    size="small"
                    disabled>
                    {t("layout.button.today")}
                  </Button>
                  {ordersToday > 0 && (
                    <Tag
                      color="error"
                      style={{ marginInlineStart: 4 }}>
                      {ordersToday}
                    </Tag>
                  )}
                </span>
              </Tooltip>
            </Space>
            <Divider
              type="vertical"
              style={{ height: 24, marginInline: 8, flex: "0 0 auto" }}
            />
            {/* Right-aligned actions */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "0 0 auto",
              }}>
              <Tooltip
                title={
                  mode === "dark"
                    ? t("layout.theme.dark")
                    : mode === "light"
                      ? t("layout.theme.light")
                      : t("layout.theme.system")
                }>
                <Segmented
                  size="small"
                  options={[
                    { label: <SunOutlined />, value: "light" },
                    { label: <MoonOutlined />, value: "dark" },
                    { label: <DesktopOutlined />, value: "system" },
                  ]}
                  value={mode}
                  onChange={(v: "light" | "dark" | "system") => setMode(v)}
                />
              </Tooltip>
              <Select
                size="small"
                value={lang}
                onChange={(v) => setLang(v)}
                style={{ width: 90 }}
                options={[
                  { value: "ru", label: "Рус" },
                  { value: "uk", label: "Укр" },
                ]}
              />
              <Dropdown
                menu={{ items: userMenu }}
                trigger={["click"]}>
                <Space style={{ cursor: "pointer" }}>
                  <Avatar size={28}>A</Avatar>
                  <Typography.Text>{t("layout.user.name")}</Typography.Text>
                </Space>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <div
            style={{
              background: token.colorBgContainer,
              padding: 16,
              minHeight: "calc(100vh - 134px)",
            }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
