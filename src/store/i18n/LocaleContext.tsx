import React, { useMemo, useState, useEffect } from "react";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import ukUA from "antd/locale/uk_UA";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import "dayjs/locale/uk";
import { ru, uk, type I18nDict } from "./dictionaries";
import { LocaleContext, type LocaleContextValue } from "./context";

export type Lang = "ru" | "uk";

export type { LocaleContextValue };

function getAntdLocale(lang: Lang) {
  return lang === "ru" ? ruRU : ukUA;
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("adm_lang") as Lang | null;
    return saved || "ru";
  });

  useEffect(() => {
    localStorage.setItem("adm_lang", lang);
    dayjs.locale(lang === "ru" ? "ru" : "uk");
  }, [lang]);

  const dict: I18nDict = useMemo(() => (lang === "ru" ? ru : uk), [lang]);
  const t = useMemo(() => (key: string) => dict[key] ?? key, [dict]);

  return (
    <LocaleContext.Provider value={{ lang, setLang, t }}>
      <ConfigProvider locale={getAntdLocale(lang)}>{children}</ConfigProvider>
    </LocaleContext.Provider>
  );
}
