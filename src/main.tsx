import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./store/AuthContext";
import ThemeProvider from "./store/ThemeProvider";
import { LocaleProvider } from "./store/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>
);
