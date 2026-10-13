import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Makes antd v5 fully compatible with React 19 (restores the removed
// ReactDOM.render/unmount APIs used by message/notification/Modal/Popconfirm,
// etc.). Must be imported before antd is used. Without it those throw at
// runtime under React 19.
import "@ant-design/v5-patch-for-react-19";
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
