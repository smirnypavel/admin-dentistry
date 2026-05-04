import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Spin,
  Tabs,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { getAdminPageContent, updatePageContent } from "../api/pages";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Reusable string-list editor ────────────────────────────────────────────

interface StringListEditorProps {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  placeholder?: string;
}

function StringListEditor({ value, onChange, label, placeholder }: StringListEditorProps) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <div style={{ marginTop: 4 }}>
        {value.map((item, i) => (
          <Space key={i} style={{ display: "flex", marginBottom: 4 }} align="baseline">
            <TextArea
              autoSize
              value={item}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              style={{ width: 480 }}
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => onChange([...value, ""])}
          style={{ marginTop: 4 }}
        >
          Додати
        </Button>
      </div>
    </div>
  );
}

// ─── About tab ───────────────────────────────────────────────────────────────

interface Segment { number: string; title: string; desc: string }

function AboutTab({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const story = (data.story as string[]) ?? [];
  const segments = (data.segments as Segment[]) ?? [];

  const setSegment = (i: number, field: keyof Segment, val: string) => {
    const next = segments.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    set("segments", next);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <Title level={5}>Hero</Title>
      <Form.Item label="Заголовок">
        <Input value={data.heroTitle as string ?? ""} onChange={(e) => set("heroTitle", e.target.value)} />
      </Form.Item>
      <Form.Item label="Підзаголовок">
        <Input value={data.heroSubtitle as string ?? ""} onChange={(e) => set("heroSubtitle", e.target.value)} />
      </Form.Item>

      <Divider />
      <Title level={5}>Наша історія</Title>
      <StringListEditor
        label="Абзаци"
        value={story}
        onChange={(v) => set("story", v)}
        placeholder="Абзац тексту..."
      />

      <Divider />
      <Title level={5}>Цінова філософія</Title>
      <Form.Item label="Вступний текст">
        <TextArea autoSize={{ minRows: 2 }} value={data.pricingIntro as string ?? ""} onChange={(e) => set("pricingIntro", e.target.value)} />
      </Form.Item>

      <Text type="secondary" style={{ fontSize: 12 }}>Сегменти</Text>
      {segments.map((seg, i) => (
        <Card
          key={i}
          size="small"
          style={{ marginBottom: 8, marginTop: 6 }}
          extra={
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => set("segments", segments.filter((_, idx) => idx !== i))}
            />
          }
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input addonBefore="№" value={seg.number} onChange={(e) => setSegment(i, "number", e.target.value)} style={{ width: 120 }} />
            <Input addonBefore="Назва" value={seg.title} onChange={(e) => setSegment(i, "title", e.target.value)} />
            <TextArea autoSize value={seg.desc} placeholder="Опис сегменту..." onChange={(e) => setSegment(i, "desc", e.target.value)} />
          </Space>
        </Card>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => set("segments", [...segments, { number: String(segments.length + 1).padStart(2, "0"), title: "", desc: "" }])}
        style={{ marginTop: 4 }}
      >
        Додати сегмент
      </Button>

      <Divider />
      <Title level={5}>CTA блок</Title>
      <Form.Item label="Заголовок CTA">
        <Input value={data.ctaTitle as string ?? ""} onChange={(e) => set("ctaTitle", e.target.value)} />
      </Form.Item>
      <Form.Item label="Підзаголовок CTA">
        <Input value={data.ctaSubtitle as string ?? ""} onChange={(e) => set("ctaSubtitle", e.target.value)} />
      </Form.Item>
    </div>
  );
}

// ─── Delivery tab ─────────────────────────────────────────────────────────────

function DeliveryTab({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });

  return (
    <div style={{ maxWidth: 680 }}>
      <Title level={5}>Hero</Title>
      <Form.Item label="Заголовок"><Input value={data.heroTitle as string ?? ""} onChange={(e) => set("heroTitle", e.target.value)} /></Form.Item>
      <Form.Item label="Підзаголовок"><TextArea autoSize value={data.heroSubtitle as string ?? ""} onChange={(e) => set("heroSubtitle", e.target.value)} /></Form.Item>

      <Divider />
      <Title level={5}>Доставка по Києву</Title>
      <Form.Item label="Заголовок"><Input value={data.kyivTitle as string ?? ""} onChange={(e) => set("kyivTitle", e.target.value)} /></Form.Item>
      <Form.Item label="Години роботи"><Input value={data.kyivHours as string ?? ""} onChange={(e) => set("kyivHours", e.target.value)} /></Form.Item>
      <Form.Item label="Нотатка менеджерам"><TextArea autoSize value={data.managerNote as string ?? ""} onChange={(e) => set("managerNote", e.target.value)} /></Form.Item>
      <StringListEditor label="Умови доставки по Києву" value={(data.kyivItems as string[]) ?? []} onChange={(v) => set("kyivItems", v)} />

      <Divider />
      <Title level={5}>Доставка по Україні</Title>
      <Form.Item label="Заголовок"><Input value={data.ukraineTitle as string ?? ""} onChange={(e) => set("ukraineTitle", e.target.value)} /></Form.Item>
      <StringListEditor label="Умови доставки по Україні" value={(data.ukraineItems as string[]) ?? []} onChange={(v) => set("ukraineItems", v)} />

      <Divider />
      <Title level={5}>Умови відвантаження</Title>
      <Form.Item label="Примітка відвантаження"><TextArea autoSize value={data.shippingNote as string ?? ""} onChange={(e) => set("shippingNote", e.target.value)} /></Form.Item>
      <Form.Item label="Мінімальне замовлення"><Input value={data.minOrder as string ?? ""} onChange={(e) => set("minOrder", e.target.value)} /></Form.Item>

      <Divider />
      <Title level={5}>Оплата</Title>
      <Form.Item label="Вступний текст"><Input value={data.paymentIntro as string ?? ""} onChange={(e) => set("paymentIntro", e.target.value)} /></Form.Item>
      <StringListEditor label="Методи оплати" value={(data.paymentMethods as string[]) ?? []} onChange={(v) => set("paymentMethods", v)} />

      <Divider />
      <Title level={5}>Повернення та обмін</Title>
      <StringListEditor label="Пункти повернення" value={(data.returnItems as string[]) ?? []} onChange={(v) => set("returnItems", v)} />
      <StringListEditor label="Кроки заміни браку" value={(data.defectSteps as string[]) ?? []} onChange={(v) => set("defectSteps", v)} />
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────────────────────

interface ContactMethod { type: string; title: string; primary: string; secondary: string; description: string; action: string; href: string; }
interface WorkingHour { day: string; hours: string; }

function ContactsTab({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const methods = (data.contactMethods as ContactMethod[]) ?? [];
  const hours = (data.workingHours as WorkingHour[]) ?? [];

  const setMethod = (i: number, field: keyof ContactMethod, val: string) => {
    const next = methods.map((m, idx) => idx === i ? { ...m, [field]: val } : m);
    set("contactMethods", next);
  };

  const setHour = (i: number, field: keyof WorkingHour, val: string) => {
    const next = hours.map((h, idx) => idx === i ? { ...h, [field]: val } : h);
    set("workingHours", next);
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <Title level={5}>Hero</Title>
      <Form.Item label="Заголовок (\\n = новий рядок)"><Input value={data.heroTitle as string ?? ""} onChange={(e) => set("heroTitle", e.target.value)} /></Form.Item>
      <Form.Item label="Підзаголовок"><TextArea autoSize value={data.heroSubtitle as string ?? ""} onChange={(e) => set("heroSubtitle", e.target.value)} /></Form.Item>
      <Form.Item label="Текст кнопки"><Input value={data.heroButtonText as string ?? ""} onChange={(e) => set("heroButtonText", e.target.value)} /></Form.Item>

      <Divider />
      <Title level={5}>Методи зв'язку</Title>
      {methods.map((m, i) => (
        <Card
          key={i}
          size="small"
          style={{ marginBottom: 8 }}
          extra={
            <Button type="text" danger size="small" icon={<DeleteOutlined />}
              onClick={() => set("contactMethods", methods.filter((_, idx) => idx !== i))}
            />
          }
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space>
              <Input addonBefore="Тип" value={m.type} onChange={(e) => setMethod(i, "type", e.target.value)} style={{ width: 180 }} placeholder="phone/email/chat/meeting" />
              <Input addonBefore="Назва" value={m.title} onChange={(e) => setMethod(i, "title", e.target.value)} />
            </Space>
            <Input addonBefore="Primary" value={m.primary} onChange={(e) => setMethod(i, "primary", e.target.value)} />
            <Input addonBefore="Secondary" value={m.secondary} onChange={(e) => setMethod(i, "secondary", e.target.value)} />
            <TextArea autoSize value={m.description} placeholder="Опис" onChange={(e) => setMethod(i, "description", e.target.value)} />
            <Space>
              <Input addonBefore="Кнопка" value={m.action} onChange={(e) => setMethod(i, "action", e.target.value)} style={{ width: 220 }} />
              <Input addonBefore="href" value={m.href} onChange={(e) => setMethod(i, "href", e.target.value)} style={{ width: 320 }} />
            </Space>
          </Space>
        </Card>
      ))}
      <Button type="dashed" icon={<PlusOutlined />}
        onClick={() => set("contactMethods", [...methods, { type: "phone", title: "", primary: "", secondary: "", description: "", action: "", href: "" }])}
      >Додати метод</Button>

      <Divider />
      <Title level={5}>Локація</Title>
      <Form.Item label="Адреса"><Input value={data.address as string ?? ""} onChange={(e) => set("address", e.target.value)} /></Form.Item>

      <Text type="secondary" style={{ fontSize: 12 }}>Години роботи</Text>
      {hours.map((h, i) => (
        <Space key={i} style={{ display: "flex", marginBottom: 4, marginTop: 4 }} align="baseline">
          <Input value={h.day} placeholder="День" onChange={(e) => setHour(i, "day", e.target.value)} style={{ width: 240 }} />
          <Input value={h.hours} placeholder="Часи" onChange={(e) => setHour(i, "hours", e.target.value)} style={{ width: 180 }} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => set("workingHours", hours.filter((_, idx) => idx !== i))} />
        </Space>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 4 }}
        onClick={() => set("workingHours", [...hours, { day: "", hours: "" }])}
      >Додати рядок</Button>

      <Divider />
      <Title level={5}>Як добратись</Title>
      <Form.Item label="Метро"><Input value={data.howToGetMetro as string ?? ""} onChange={(e) => set("howToGetMetro", e.target.value)} /></Form.Item>
      <Form.Item label="Транспорт"><Input value={data.howToGetTransport as string ?? ""} onChange={(e) => set("howToGetTransport", e.target.value)} /></Form.Item>
      <Form.Item label="Парковка"><Input value={data.howToGetParking as string ?? ""} onChange={(e) => set("howToGetParking", e.target.value)} /></Form.Item>

      <Divider />
      <Title level={5}>Google Maps URLs</Title>
      <Form.Item label="destinationUrl"><Input value={data.destinationUrl as string ?? ""} onChange={(e) => set("destinationUrl", e.target.value)} /></Form.Item>
      <Form.Item label="openMapUrl"><Input value={data.openMapUrl as string ?? ""} onChange={(e) => set("openMapUrl", e.target.value)} /></Form.Item>
      <Form.Item label="embedMapUrl"><Input value={data.embedMapUrl as string ?? ""} onChange={(e) => set("embedMapUrl", e.target.value)} /></Form.Item>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_KEYS = [
  { key: "about", label: "Про нас" },
  { key: "delivery", label: "Доставка" },
  { key: "contacts-page", label: "Контакти" },
];

export default function PagesContentPage() {
  const { message } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState("about");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, Record<string, unknown>>>({});

  const loadPage = useCallback(async (key: string) => {
    if (dataMap[key]) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const d = await getAdminPageContent(key);
      setDataMap((prev) => ({ ...prev, [key]: d }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [dataMap]);

  useEffect(() => {
    loadPage(activeTab);
  }, [activeTab, loadPage]);

  const handleSave = async () => {
    const d = dataMap[activeTab];
    if (!d) return;
    setSaving(true);
    try {
      await updatePageContent(activeTab, d);
      message.success("Збережено!");
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const currentData = dataMap[activeTab] ?? {};
  const setCurrentData = (d: Record<string, unknown>) =>
    setDataMap((prev) => ({ ...prev, [activeTab]: d }));

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Редагування сторінок</Title>
        <Text type="secondary">Зміни зберігаються в базі та одразу відображаються на сайті</Text>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          tabBarExtraContent={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Зберегти
            </Button>
          }
          items={PAGE_KEYS.map(({ key, label }) => ({
            key,
            label,
            children: loading ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}><Spin /></div>
            ) : (
              <Form layout="vertical">
                {key === "about" && <AboutTab data={currentData} onChange={setCurrentData} />}
                {key === "delivery" && <DeliveryTab data={currentData} onChange={setCurrentData} />}
                {key === "contacts-page" && <ContactsTab data={currentData} onChange={setCurrentData} />}
              </Form>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
