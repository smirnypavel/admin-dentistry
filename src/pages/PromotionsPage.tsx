import { useEffect, useState } from "react";
import { App as AntApp, Button, Card, Form, Spin, Tabs } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { AdminLayout } from "../components/AdminLayout";
import { PromotionsTab } from "./PagesContentPage";
import { getAdminPageContent, updatePageContent } from "../api/pages";
import { PromoSlidesPage } from "./PromoSlidesPage";
import { PromoGridPage } from "./PromoGridPage";

const KEY = "promotions-section";

/** Texts + countdown timer for the homepage promotions section. */
function PromotionsSettings() {
  const { message } = AntApp.useApp();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminPageContent(KEY)
      .then((d) => setData(d ?? {}))
      .catch(() => setData({}));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updatePageContent(KEY, data);
      message.success("Збережено!");
    } catch {
      message.error("Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card
      style={{ maxWidth: 640 }}
      title="Тексти та таймер акційної секції"
      extra={
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          Зберегти
        </Button>
      }
    >
      <Form layout="vertical">
        <PromotionsTab data={data} onChange={setData} settingsOnly />
      </Form>
    </Card>
  );
}

export function PromotionsPage() {
  return (
    <AdminLayout>
      <div style={{ padding: "24px 32px" }}>
        <Tabs
          items={[
            {
              key: "settings",
              label: "⚙️ Налаштування (тексти + таймер)",
              children: <PromotionsSettings />,
            },
            {
              key: "slider",
              label: "🎞 Слайдер (великий блок)",
              children: <PromoSlidesPage embedded />,
            },
            {
              key: "grid",
              label: "🗂 Сітка (нижні картки)",
              children: <PromoGridPage embedded />,
            },
          ]}
        />
      </div>
    </AdminLayout>
  );
}

export default PromotionsPage;
