import React, { useEffect, useMemo, useState } from "react";
import { App as AntdApp, ConfigProvider, theme as antdTheme } from "antd";
import { ThemeContext, type ThemeMode } from "./themeContext";

type ThemeContextValue = { mode: ThemeMode; setMode: (m: ThemeMode) => void };

function useSystemDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersDark;
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemDark = useSystemDark();
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("adm_theme") as ThemeMode | null;
    return saved || "system";
  });

  useEffect(() => {
    localStorage.setItem("adm_theme", mode);
  }, [mode]);

  const isDark = mode === "dark" || (mode === "system" && systemDark);

  // Calm, eye-friendly palette
  const tokenOverrides = useMemo(
    () => ({
      colorPrimary: "#4C89F4",
      colorInfo: "#4C89F4",
      colorBgLayout: isDark ? "#111315" : "#f6f8fa",
      colorBgContainer: isDark ? "#1c1f23" : "#ffffff",
      colorBorder: isDark ? "#2a2f35" : "#e5e7eb",
    }),
    [isDark]
  );

  const algorithms = useMemo(
    () => [isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm],
    [isDark]
  );

  const ctx: ThemeContextValue = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ThemeContext.Provider value={ctx}>
      <ConfigProvider
        theme={{
          token: tokenOverrides,
          algorithm: algorithms,
          components: {
            Layout: {
              siderBg: tokenOverrides.colorBgContainer,
              bodyBg: tokenOverrides.colorBgLayout,
              headerBg: tokenOverrides.colorBgContainer,
              footerBg: tokenOverrides.colorBgContainer,
            },
            Menu: {
              darkItemBg: isDark ? tokenOverrides.colorBgContainer : undefined,
              darkPopupBg: isDark ? tokenOverrides.colorBgContainer : undefined,
              itemBg: tokenOverrides.colorBgContainer,
              itemHoverBg: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.02)",
              itemSelectedBg: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(76,137,244,0.10)",
            },
          },
        }}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
