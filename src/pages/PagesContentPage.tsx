import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { getAdminPageContent, updatePageContent } from "../api/pages";
import { listGalleryImages, type GalleryImage } from "../api/gallery";
import {
  listPromoSlides,
  createPromoSlide,
  updatePromoSlide,
  deletePromoSlide,
  type PromoSlide,
} from "../api/promo-slides";
import { ImageUploader } from "../components/ImageUploader";
import { AdminLayout } from "../components/AdminLayout";

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

// ─── Preview shared styles ────────────────────────────────────────────────────

const pv: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Inter', system-ui, sans-serif", color: "#1c1917", fontSize: 14, lineHeight: 1.6 },
  hero: { background: "#fafaf9", borderBottom: "1px solid #e7e5e4", padding: "32px 24px", textAlign: "center" },
  heroH1: { fontSize: 22, fontWeight: 300, margin: "0 0 8px", color: "#1c1917" },
  heroSub: { fontSize: 14, color: "#78716c", margin: 0 },
  section: { padding: "24px 24px" },
  h2: { fontSize: 16, fontWeight: 400, color: "#1c1917", margin: "0 0 12px" },
  h3: { fontSize: 14, fontWeight: 500, color: "#1c1917", margin: "0 0 6px" },
  para: { color: "#57534e", marginBottom: 10, fontSize: 13 },
  card: { border: "2px solid #e7e5e4", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  cardDark: { background: "#1c1917", color: "#fff", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  bullet: { display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start", color: "#57534e", fontSize: 13 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#1c1917", marginTop: 6, flexShrink: 0 },
  badge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#1c1917", color: "#fff", fontWeight: 600, flexShrink: 0, fontSize: 12 },
  row: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  num: { fontSize: 36, fontWeight: 300, color: "#a8a29e", marginRight: 14, flexShrink: 0 },
  ctaSection: { background: "#f5f5f4", padding: "28px 24px", textAlign: "center" },
  methodCard: { background: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, padding: "14px", flex: "1 1 120px" },
  infoRow: { display: "flex", gap: 8, marginBottom: 6, alignItems: "center", fontSize: 13, color: "#57534e" },
};

// ─── About Preview ────────────────────────────────────────────────────────────

function AboutPreview({ data, galleryImages }: { data: Record<string, unknown>; galleryImages: GalleryImage[] }) {
  const heroTitle = (data.heroTitle as string) ?? "";
  const heroSubtitle = (data.heroSubtitle as string) ?? "";
  const story = (data.story as string[]) ?? [];
  const pricingIntro = (data.pricingIntro as string) ?? "";
  const segments = (data.segments as { number: string; title: string; desc: string }[]) ?? [];
  const ctaTitle = (data.ctaTitle as string) ?? "";
  const ctaSubtitle = (data.ctaSubtitle as string) ?? "";

  return (
    <div style={pv.page}>
      <div style={pv.hero}>
        <div style={pv.heroH1}>{heroTitle || <span style={{ color: "#ccc" }}>Заголовок…</span>}</div>
        <div style={pv.heroSub}>{heroSubtitle || <span style={{ color: "#ccc" }}>Підзаголовок…</span>}</div>
      </div>

      {story.length > 0 && (
        <div style={pv.section}>
          <div style={{ ...pv.h2, fontWeight: 300 }}>Наша історія</div>
          {story.map((p, i) => (
            <p key={i} style={{ ...pv.para, ...(i === 0 ? { fontSize: 15, fontWeight: 300, color: "#1c1917" } : {}) }}>{p}</p>
          ))}
        </div>
      )}

      {/* Gallery section */}
      <div style={{ background: "#fafaf9", borderTop: "1px solid #e7e5e4", borderBottom: "1px solid #e7e5e4", padding: "16px 24px" }}>
        <div style={{ ...pv.h2, marginBottom: 10, color: "#78716c", fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" as const }}>Галерея фото</div>
        {galleryImages.length === 0 ? (
          <div style={{ color: "#a8a29e", fontSize: 12, fontStyle: "italic", padding: "8px 0" }}>
            Немає фото — додайте їх у розділі <strong>Галерея</strong> (меню ліворуч)
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {galleryImages.filter((g) => g.isActive).map((img) => (
              <div key={img._id} style={{ borderRadius: 8, overflow: "hidden", border: "2px solid #e7e5e4", aspectRatio: "3/4", background: "#f5f5f4", position: "relative" }}>
                <img
                  src={img.imageUrl}
                  alt={img.altI18n?.uk ?? "gallery"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {(pricingIntro || segments.length > 0) && (
        <div style={pv.section}>
          {pricingIntro && <p style={pv.para}>{pricingIntro}</p>}
          {segments.map((s, i) => (
            <div key={i} style={pv.card}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <span style={pv.num}>{s.number}</span>
                <div>
                  <div style={pv.h3}>{s.title || <span style={{ color: "#ccc" }}>Назва сегменту…</span>}</div>
                  <div style={{ color: "#78716c", fontSize: 13 }}>{s.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(ctaTitle || ctaSubtitle) && (
        <div style={pv.ctaSection}>
          <div style={{ ...pv.heroH1, fontSize: 20 }}>{ctaTitle}</div>
          <div style={{ color: "#57534e", fontWeight: 500, fontSize: 14, marginTop: 6 }}>{ctaSubtitle}</div>
        </div>
      )}
    </div>
  );
}

// ─── Delivery Preview ─────────────────────────────────────────────────────────

function DeliveryPreview({ data }: { data: Record<string, unknown> }) {
  const heroTitle = (data.heroTitle as string) ?? "";
  const heroSubtitle = (data.heroSubtitle as string) ?? "";
  const managerNote = (data.managerNote as string) ?? "";
  const kyivTitle = (data.kyivTitle as string) ?? "";
  const kyivHours = (data.kyivHours as string) ?? "";
  const kyivItems = (data.kyivItems as string[]) ?? [];
  const ukraineTitle = (data.ukraineTitle as string) ?? "";
  const ukraineItems = (data.ukraineItems as string[]) ?? [];
  const shippingNote = (data.shippingNote as string) ?? "";
  const minOrder = (data.minOrder as string) ?? "";
  const paymentIntro = (data.paymentIntro as string) ?? "";
  const paymentMethods = (data.paymentMethods as string[]) ?? [];
  const returnItems = (data.returnItems as string[]) ?? [];
  const defectSteps = (data.defectSteps as string[]) ?? [];

  return (
    <div style={pv.page}>
      <div style={pv.hero}>
        <div style={pv.heroH1}>{heroTitle || <span style={{ color: "#ccc" }}>Заголовок…</span>}</div>
        {heroSubtitle && <div style={pv.heroSub}>{heroSubtitle}</div>}
      </div>

      <div style={pv.section}>
        <div style={pv.h2}>Доставка</div>

        {managerNote && (
          <div style={{ ...pv.card, background: "#fafaf9", borderLeft: "4px solid #1c1917", borderRadius: 6, marginBottom: 12 }}>
            <span style={{ color: "#57534e", fontSize: 13 }}>{managerNote}</span>
          </div>
        )}

        {kyivTitle && (
          <div style={pv.card}>
            <div style={pv.h3}>{kyivTitle}</div>
            {kyivHours && <div style={{ color: "#78716c", fontSize: 12, marginBottom: 8 }}>🕐 {kyivHours}</div>}
            {kyivItems.map((it, i) => (
              <div key={i} style={pv.bullet}><span style={pv.dot} /><span>{it}</span></div>
            ))}
          </div>
        )}

        {ukraineTitle && (
          <div style={pv.card}>
            <div style={pv.h3}>{ukraineTitle}</div>
            {ukraineItems.map((it, i) => (
              <div key={i} style={pv.bullet}><span style={pv.dot} /><span>{it}</span></div>
            ))}
          </div>
        )}

        {(shippingNote || minOrder) && (
          <div style={pv.cardDark}>
            {shippingNote && <div style={{ color: "#d6d3d1", fontSize: 13, marginBottom: 6 }}>{shippingNote}</div>}
            {minOrder && <div style={{ color: "#fff", fontWeight: 500, fontSize: 13, borderTop: "1px solid #44403c", paddingTop: 8 }}>{minOrder}</div>}
          </div>
        )}
      </div>

      {(paymentIntro || paymentMethods.length > 0) && (
        <div style={{ ...pv.section, paddingTop: 0 }}>
          <div style={pv.h2}>Варіанти оплати</div>
          <div style={{ background: "#fafaf9", borderRadius: 8, padding: "12px 16px" }}>
            {paymentIntro && <div style={{ ...pv.para, marginBottom: 10 }}>{paymentIntro}</div>}
            {paymentMethods.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                <span style={pv.badge}>{i + 1}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(returnItems.length > 0 || defectSteps.length > 0) && (
        <div style={{ ...pv.section, paddingTop: 0 }}>
          <div style={pv.h2}>Повернення та обмін</div>
          {returnItems.map((it, i) => (
            <div key={i} style={pv.card}>
              <div style={pv.bullet}><span style={pv.dot} /><span style={{ fontSize: 13 }}>{it}</span></div>
            </div>
          ))}
          {defectSteps.length > 0 && (
            <div style={pv.cardDark}>
              <div style={{ color: "#fff", fontWeight: 500, marginBottom: 10, fontSize: 13 }}>Заміна товару з браком</div>
              {defectSteps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: "#a8a29e", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ color: "#d6d3d1", fontSize: 13 }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Contacts Preview ─────────────────────────────────────────────────────────

const CONTACT_ICONS: Record<string, string> = { phone: "📞", email: "✉️", chat: "💬", meeting: "🤝" };

function ContactsPreview({ data }: { data: Record<string, unknown> }) {
  const heroTitle = (data.heroTitle as string) ?? "";
  const heroSubtitle = (data.heroSubtitle as string) ?? "";
  const heroButtonText = (data.heroButtonText as string) ?? "";
  const methods = (data.contactMethods as { type: string; title: string; primary: string; secondary: string; description: string; action: string }[]) ?? [];
  const address = (data.address as string) ?? "";
  const hours = (data.workingHours as { day: string; hours: string }[]) ?? [];
  const metro = (data.howToGetMetro as string) ?? "";
  const transport = (data.howToGetTransport as string) ?? "";
  const parking = (data.howToGetParking as string) ?? "";

  const titleLines = heroTitle.split("\n");

  return (
    <div style={pv.page}>
      {/* Hero */}
      <div style={{ ...pv.hero, padding: "32px 24px" }}>
        <div style={{ ...pv.heroH1, fontSize: 20 }}>
          {titleLines[0]}
          {titleLines.length > 1 && <><br /><span style={{ fontWeight: 400 }}>{titleLines.slice(1).join(" ")}</span></>}
        </div>
        {heroSubtitle && <div style={{ ...pv.heroSub, marginBottom: 14 }}>{heroSubtitle}</div>}
        {heroButtonText && (
          <div style={{ display: "inline-block", border: "2px solid #1c1917", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 500 }}>
            {heroButtonText} ↓
          </div>
        )}
      </div>

      {/* Contact methods */}
      {methods.length > 0 && (
        <div style={{ ...pv.section, background: "#fafaf9" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {methods.map((m, i) => (
              <div key={i} style={pv.methodCard}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{CONTACT_ICONS[m.type] ?? "📋"}</div>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{m.title}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{m.primary}</div>
                {m.secondary && <div style={{ fontSize: 11, color: "#78716c" }}>{m.secondary}</div>}
                <div style={{ fontSize: 11, color: "#78716c", marginTop: 4 }}>{m.description}</div>
                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600 }}>{m.action} →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      <div style={pv.section}>
        <div style={pv.h2}>Наша локація</div>
        {address && <div style={pv.infoRow}>📍 <span style={{ fontWeight: 500 }}>{address}</span></div>}
        {hours.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {hours.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: i === 0 ? "#e7e5e4" : "#fafaf9", borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                <span>🕐 {h.day}</span><span style={{ fontWeight: 500 }}>{h.hours}</span>
              </div>
            ))}
          </div>
        )}
        {(metro || transport || parking) && (
          <div style={{ background: "#fafaf9", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 6 }}>Як добратись</div>
            {metro && <div style={{ ...pv.infoRow, marginBottom: 4 }}>🚇 <span>{metro}</span></div>}
            {transport && <div style={{ ...pv.infoRow, marginBottom: 4 }}>🚌 <span>{transport}</span></div>}
            {parking && <div style={pv.infoRow}>🚗 <span>{parking}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SlideFormValues = {
  title: string;
  description?: string;
  price?: string;
  oldPrice?: string;
  badge?: string;
  imageUrl?: string;
  color?: string;
  linkUrl?: string;
  isActive: boolean;
};

// ─── Slides selector (ordered list with add/remove/reorder) ──────────────────
function SlidesSelector({
  label,
  allSlides,
  selectedIds,
  onChange,
}: {
  label: string;
  allSlides: PromoSlide[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = selectedIds
    .map((id) => allSlides.find((s) => s._id === id))
    .filter(Boolean) as PromoSlide[];
  const available = allSlides.filter((s) => !selectedIds.includes(s._id));

  const add = (id: string) => onChange([...selectedIds, id]);
  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));
  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...selectedIds];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#6366f1", margin: "12px 0 8px" }}>
        {label}
      </Divider>
      {selected.length === 0 ? (
        <div style={{ color: "#a8a29e", fontSize: 12, padding: "4px 0 8px", fontStyle: "italic" }}>
          Не обрано жодного товару — усі активні слайди покажуться як fallback
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {selected.map((s, idx) => (
            <div
              key={s._id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", border: "1px solid #e7e5e4", borderRadius: 6, background: "#fff", fontSize: 12 }}
            >
              <span style={{ color: "#a8a29e", fontWeight: 600, minWidth: 18, textAlign: "right" }}>{idx + 1}.</span>
              {s.imageUrl
                ? <img src={s.imageUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                : <div style={{ width: 28, height: 28, background: "#f0f0f0", borderRadius: 4, flexShrink: 0 }} />
              }
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
              {s.price && <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{s.price}</span>}
              <Space size={2}>
                <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(idx, -1)} style={{ padding: "0 4px" }} />
                <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === selected.length - 1} onClick={() => move(idx, 1)} style={{ padding: "0 4px" }} />
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => remove(s._id)} style={{ padding: "0 4px" }} />
              </Space>
            </div>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <Select
          showSearch
          placeholder="Додати товар..."
          style={{ width: "100%" }}
          value={null}
          onChange={(id) => add(id as string)}
          optionFilterProp="label"
          options={available.map((s) => ({ value: s._id, label: s.title }))}
        />
      )}
      {available.length === 0 && selected.length > 0 && (
        <div style={{ color: "#a8a29e", fontSize: 11, fontStyle: "italic" }}>Усі товари вже обрані</div>
      )}
    </div>
  );
}

// ─── Promotions Tab ────────────────────────────────────────────────────────────
function PromotionsTab({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const { message, modal } = AntApp.useApp();
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);
  const [slideForm] = Form.useForm<SlideFormValues>();

  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });
  const sliderIds = (data.sliderIds as string[]) ?? [];
  const gridIds = (data.gridIds as string[]) ?? [];

  const loadSlides = useCallback(async () => {
    setLoadingSlides(true);
    try { setSlides(await listPromoSlides()); }
    catch { /* ignore */ }
    finally { setLoadingSlides(false); }
  }, []);
  useEffect(() => { void loadSlides(); }, [loadSlides]);

  const openCreateSlide = () => {
    setEditingSlide(null);
    slideForm.resetFields();
    slideForm.setFieldsValue({ isActive: true, color: "from-yellow-300 to-yellow-400" });
    setSlideModalOpen(true);
  };
  const openEditSlide = (r: PromoSlide) => {
    setEditingSlide(r);
    slideForm.setFieldsValue({ title: r.title, description: r.description || undefined, price: r.price || undefined, oldPrice: r.oldPrice || undefined, badge: r.badge || undefined, imageUrl: r.imageUrl || undefined, color: r.color || undefined, linkUrl: r.linkUrl || undefined, isActive: r.isActive });
    setSlideModalOpen(true);
  };
  const onDeleteSlide = (r: PromoSlide) => {
    modal.confirm({
      title: "Видалити товар?",
      content: `Видалити «${r.title}»?`,
      okText: "Видалити",
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deletePromoSlide(r._id);
          message.success("Видалено");
          onChange({
            ...data,
            sliderIds: sliderIds.filter((id) => id !== r._id),
            gridIds: gridIds.filter((id) => id !== r._id),
          });
          await loadSlides();
        } catch { message.error("Не вдалося видалити"); }
      },
    });
  };
  const onSaveSlide = async () => {
    const v = await slideForm.validateFields();
    const payload = {
      title: v.title,
      description: v.description?.trim() || undefined,
      price: v.price?.trim() || undefined,
      oldPrice: v.oldPrice?.trim() || undefined,
      badge: v.badge?.trim() || undefined,
      imageUrl: v.imageUrl?.trim() || undefined,
      color: v.color?.trim() || undefined,
      linkUrl: v.linkUrl?.trim() || undefined,
      isActive: !!v.isActive,
      features: [],
    };
    try {
      if (editingSlide?._id) { await updatePromoSlide(editingSlide._id, payload); message.success("Збережено"); }
      else { await createPromoSlide(payload); message.success("Товар додано"); }
      setSlideModalOpen(false);
      await loadSlides();
    } catch { message.error("Не вдалося зберегти"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Text fields ── */}
      <Form.Item label="Заголовок секції">
        <Input value={(data.sectionTitle as string) ?? ""} onChange={(e) => set("sectionTitle", e.target.value)} placeholder="Акційні пропозиції" />
      </Form.Item>
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#78716c" }}>Таймер зворотнього відліку</Divider>
      <Form.Item label="Підпис таймера">
        <Input value={(data.countdownLabel as string) ?? ""} onChange={(e) => set("countdownLabel", e.target.value)} placeholder="До кінця акції" />
      </Form.Item>
      <Form.Item label="Підзаголовок таймера">
        <Input value={(data.countdownSublabel as string) ?? ""} onChange={(e) => set("countdownSublabel", e.target.value)} placeholder="Встигніть замовити!" />
      </Form.Item>
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#78716c" }}>Кнопки та підписи</Divider>
      <Form.Item label="Підпис ціни">
        <Input value={(data.priceLabel as string) ?? ""} onChange={(e) => set("priceLabel", e.target.value)} placeholder="Акційна ціна" />
      </Form.Item>
      <Form.Item label="Кнопка «Замовити»">
        <Input value={(data.orderBtnText as string) ?? ""} onChange={(e) => set("orderBtnText", e.target.value)} placeholder="Замовити зараз" />
      </Form.Item>
      <Form.Item label="Кнопка «Деталі»">
        <Input value={(data.detailsBtnText as string) ?? ""} onChange={(e) => set("detailsBtnText", e.target.value)} placeholder="Деталі" />
      </Form.Item>
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#78716c" }}>Кнопка показу всіх акцій</Divider>
      <Form.Item label="Текст «Показати всі»">
        <Input value={(data.showAllBtnText as string) ?? ""} onChange={(e) => set("showAllBtnText", e.target.value)} placeholder="Усі акційні пропозиції" />
      </Form.Item>
      <Form.Item label="Текст «Згорнути»">
        <Input value={(data.collapseBtnText as string) ?? ""} onChange={(e) => set("collapseBtnText", e.target.value)} placeholder="Згорнути" />
      </Form.Item>

      {/* ── Товари (CRUD) ── */}
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#78716c" }}>
        <Space>
          Всі товари акцій
          <Button type="link" size="small" icon={<PlusOutlined />} style={{ padding: 0, fontSize: 12 }} onClick={openCreateSlide}>
            Додати
          </Button>
        </Space>
      </Divider>
      <Spin spinning={loadingSlides}>
        {slides.length === 0 && !loadingSlides ? (
          <div style={{ color: "#a8a29e", fontSize: 12, padding: "4px 0", fontStyle: "italic" }}>Немає товарів — натисніть «Додати»</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slides.map((s) => (
              <div
                key={s._id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid #e7e5e4", borderRadius: 8, background: s.isActive ? "#fff" : "#fafaf9", opacity: s.isActive ? 1 : 0.6 }}
              >
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, background: "#f0f0f0", borderRadius: 5, flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "#78716c", display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                    {s.price && <span style={{ color: "#dc2626", fontWeight: 600 }}>{s.price}</span>}
                    {s.oldPrice && <span style={{ textDecoration: "line-through" }}>{s.oldPrice}</span>}
                    {s.badge && <Tag color="gold" style={{ fontSize: 10, margin: 0 }}>{s.badge}</Tag>}
                  </div>
                </div>
                <Tag color={s.isActive ? "green" : "default"} style={{ fontSize: 10, flexShrink: 0 }}>
                  {s.isActive ? "Активний" : "Вимкнений"}
                </Tag>
                <Space size={2}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditSlide(s)} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteSlide(s)} />
                </Space>
              </div>
            ))}
          </div>
        )}
      </Spin>

      {/* ── Selection: slider ── */}
      <SlidesSelector
        label="🎞 Слайдер (великий блок вгорі)"
        allSlides={slides}
        selectedIds={sliderIds}
        onChange={(ids) => set("sliderIds", ids)}
      />

      {/* ── Selection: grid ── */}
      <SlidesSelector
        label="🗂 Сітка карток (нижній блок)"
        allSlides={slides}
        selectedIds={gridIds}
        onChange={(ids) => set("gridIds", ids)}
      />

      {/* ── Modal: create/edit slide ── */}
      <Modal
        open={slideModalOpen}
        title={editingSlide ? "Редагувати товар акції" : "Новий товар акції"}
        onOk={onSaveSlide}
        onCancel={() => setSlideModalOpen(false)}
        okText="Зберегти"
        cancelText="Скасувати"
        width={600}
        destroyOnClose
      >
        <Form form={slideForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="Назва" rules={[{ required: true, message: "Вкажіть назву" }]}>
            <Input placeholder="Преміум брекети зі знижкою" />
          </Form.Item>
          <Form.Item name="description" label="Опис">
            <Input.TextArea rows={2} placeholder="Короткий опис пропозиції" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="price" label="Акційна ціна">
              <Input placeholder="2 500 ₴" />
            </Form.Item>
            <Form.Item name="oldPrice" label="Стара ціна">
              <Input placeholder="2 940 ₴" />
            </Form.Item>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="badge" label="Бейдж">
              <Input placeholder="Хіт продажів" />
            </Form.Item>
            <Form.Item name="linkUrl" label="Посилання (на товар/категорію)">
              <Input placeholder="/catalog/brekety" />
            </Form.Item>
          </div>
          <Form.Item name="color" label="Колір градієнту (Tailwind)">
            <Input placeholder="from-yellow-300 to-yellow-400" />
          </Form.Item>
          <Form.Item name="imageUrl" label="Фото товару">
            <ImageUploader
              value={slideForm.getFieldValue("imageUrl")}
              onChange={(url) => slideForm.setFieldValue("imageUrl", url)}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Активний" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Promotions Preview ────────────────────────────────────────────────────────
function PromotionsPreview({ data }: { data: Record<string, unknown> }) {
  const sectionTitle = (data.sectionTitle as string) || "Акційні пропозиції";
  const countdownLabel = (data.countdownLabel as string) || "До кінця акції";
  const countdownSublabel = (data.countdownSublabel as string) || "Встигніть замовити!";
  const priceLabel = (data.priceLabel as string) || "Акційна ціна";
  const orderBtnText = (data.orderBtnText as string) || "Замовити зараз";
  const detailsBtnText = (data.detailsBtnText as string) || "Деталі";
  const showAllBtnText = (data.showAllBtnText as string) || "Усі акційні пропозиції";
  const collapseBtnText = (data.collapseBtnText as string) || "Згорнути";

  return (
    <div style={{ ...pv.page, background: "#fafaf8" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 12px", textAlign: "center", borderBottom: "1px solid #e7e5e4" }}>
        <div style={{ fontSize: 22, fontWeight: 300, color: "#1c1917", letterSpacing: -0.5 }}>{sectionTitle}</div>
      </div>

      {/* Slider mockup */}
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Left: image placeholder */}
          <div style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)", borderRadius: 12, height: 160, display: "flex", alignItems: "flex-end", padding: 12, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, background: "rgba(0,0,0,0.15)", borderRadius: 12 }} />
            <div style={{ background: "#1c1917", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 11, position: "relative", marginLeft: "auto" }}>
              <span style={{ color: "#fbbf24" }}>★</span> Хіт продажів
            </div>
          </div>
          {/* Right: content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 400, color: "#1c1917" }}>Преміум брекети зі знижкою</div>
            <div style={{ fontSize: 11, color: "#57534e" }}>Спеціальна пропозиція на самолігуючі брекет-системи преміум класу.</div>
            {/* Countdown */}
            <div style={{ border: "2px solid #ef4444", borderRadius: 10, padding: "8px 10px", background: "#fff" }}>
              <div style={{ fontSize: 10, color: "#57534e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontWeight: 500 }}>{countdownLabel}</div>
              <div style={{ fontSize: 9, color: "#78716c", marginBottom: 4 }}>{countdownSublabel}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[{ v: "14", l: "дні" }, { v: "06", l: "год" }, { v: "32", l: "хв" }, { v: "45", l: "сек" }].map((u, i) => (
                  <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{u.v}</span>
                    <span style={{ fontSize: 8, color: "#78716c", textTransform: "uppercase" }}>{u.l}</span>
                  </span>
                ))}
              </div>
            </div>
            {/* Price */}
            <div style={{ borderTop: "2px solid #e7e5e4", paddingTop: 8 }}>
              <div style={{ fontSize: 10, color: "#57534e", fontWeight: 500, marginBottom: 2 }}>{priceLabel}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>2 500 ₴</div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, background: "#1c1917", color: "#fff", borderRadius: 8, padding: "6px 8px", fontSize: 11, textAlign: "center", fontWeight: 500 }}>{orderBtnText}</div>
                <div style={{ border: "2px solid #d6d3d1", borderRadius: 8, padding: "6px 8px", fontSize: 11, fontWeight: 500 }}>{detailsBtnText}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Product cards grid (mini) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
          {["Преміум брекети", "Комплект дуг 2+1", "Лігатури", "Стартовий набір"].map((title, i) => (
            <div key={i} style={{ border: "2px solid #d6d3d1", borderRadius: 8, padding: "8px 6px", background: "#fff" }}>
              <div style={{ background: `linear-gradient(135deg, #fde68a, #fbbf24)`, borderRadius: 6, height: 40, marginBottom: 6 }} />
              <div style={{ fontSize: 10, fontWeight: 500, color: "#1c1917", marginBottom: 3, lineHeight: 1.3 }}>{title}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>2 500 ₴</div>
            </div>
          ))}
        </div>

        {/* Show all / collapse buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <div style={{ border: "2px solid #1c1917", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>
            🛍 {showAllBtnText}
          </div>
          <div style={{ border: "2px solid #d6d3d1", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 500, color: "#78716c" }}>
            {collapseBtnText}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_KEYS = [
  { key: "about", label: "Про нас" },
  { key: "delivery", label: "Доставка" },
  { key: "contacts-page", label: "Контакти" },
  { key: "promotions-section", label: "Акції" },
];

export default function PagesContentPage() {
  const { message } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState("about");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataMap, setDataMap] = useState<Record<string, Record<string, unknown>>>({});
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // Load gallery images once (for About preview)
  useEffect(() => {
    listGalleryImages().then(setGalleryImages).catch(() => {});
  }, []);

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
    <AdminLayout>
    <div style={{ padding: "24px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>Редагування сторінок</Title>
        <Text type="secondary">Зміни зберігаються в базі та одразу відображаються на сайті</Text>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

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
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              {/* ── Left: form ── */}
              <div style={{ flex: "0 0 560px", minWidth: 0 }}>
                <Card>
                  <Form layout="vertical">
                    {key === "about" && <AboutTab data={currentData} onChange={setCurrentData} />}
                    {key === "delivery" && <DeliveryTab data={currentData} onChange={setCurrentData} />}
                    {key === "contacts-page" && <ContactsTab data={currentData} onChange={setCurrentData} />}
                    {key === "promotions-section" && <PromotionsTab data={currentData} onChange={setCurrentData} />}
                  </Form>
                </Card>
              </div>

              {/* ── Right: preview ── */}
              <div style={{ flex: 1, minWidth: 320, position: "sticky", top: 24 }}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <EyeOutlined style={{ color: "#6366f1" }} />
                      <span style={{ fontWeight: 500 }}>Прев'ю сторінки</span>
                      <Tooltip title="Оновлюється в реальному часі під час редагування">
                        <Badge color="green" text={<Text type="secondary" style={{ fontSize: 11 }}>live</Text>} />
                      </Tooltip>
                    </Space>
                  }
                  styles={{
                    body: { padding: 0, maxHeight: "calc(100vh - 220px)", overflowY: "auto" },
                    header: { borderBottom: "1px solid #f0f0f0" },
                  }}
                >
                  {/* device frame */}
                  <div style={{ background: "#f5f5f4", padding: "8px 12px", borderBottom: "1px solid #e7e5e4", display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                    <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#78716c", marginLeft: 8 }}>
                      orthostore.com.ua/{key === "contacts-page" ? "contacts" : key === "promotions-section" ? "" : key}
                    </div>
                    <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>preview</Tag>
                  </div>

                  <div style={{ transform: "scale(0.9)", transformOrigin: "top left", width: "111%", minHeight: 200 }}>
                    {key === "about" && <AboutPreview data={currentData} galleryImages={galleryImages} />}
                    {key === "delivery" && <DeliveryPreview data={currentData} />}
                    {key === "contacts-page" && <ContactsPreview data={currentData} />}
                    {key === "promotions-section" && <PromotionsPreview data={currentData} />}}
                  </div>
                </Card>
              </div>
            </div>
          ),
        }))}
      />
    </div>
    </AdminLayout>
  );
}
