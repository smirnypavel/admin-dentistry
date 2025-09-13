import { createContext } from "react";
import type { Lang } from "./LocaleContext";

export type LocaleContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

export const LocaleContext = createContext<LocaleContextValue | undefined>(
  undefined
);
