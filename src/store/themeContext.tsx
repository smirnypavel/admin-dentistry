import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return ctx;
}
