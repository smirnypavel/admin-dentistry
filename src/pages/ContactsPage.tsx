import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tabs,
  Modal,
  Card,
  Checkbox,
  Empty,
  Typography,
  Divider,
  Segmented,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  InstagramOutlined,
  FacebookOutlined,
  SendOutlined,
  MessageOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "../components/AdminLayout";
import type {
  ContactCard,
  ContactItem,
  ContactItemType,
} from "../api/contacts";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "../api/contacts";
import { useI18n } from "../store/i18n";
import dayjs from "dayjs";

interface FormValues {
  addressUk?: string;
  addressEn?: string;
  items: ContactItem[];
  sort?: number;
  isActive?: boolean;
}

export function ContactsPage() {
  const { t } = useI18n();
  const { message, modal } = AntApp.useApp();

  const [cards, setCards] = useState<ContactCard[]>([]);
  const [loading, setLoading] = useState(false);

  // Preview controls (storefront-like)
  const [previewLang, setPreviewLang] = useState<"uk" | "en">("uk");
  const [showHidden, setShowHidden] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContactCard | null>(null);
  const [form] = Form.useForm<FormValues>();

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<ContactItemType>("phone");
  const [bulkText, setBulkText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listContacts();
      setCards(data);
    } catch {
      message.error(t("contacts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeLabel = (type: ContactItemType) =>
    ({
      phone: t("contacts.itemType.phone") || "Телефон",
      email: t("contacts.itemType.email") || "Email",
      telegram: t("contacts.itemType.telegram") || "Telegram",
      viber: t("contacts.itemType.viber") || "Viber",
      whatsapp: t("contacts.itemType.whatsapp") || "WhatsApp",
      instagram: t("contacts.itemType.instagram") || "Instagram",
      facebook: t("contacts.itemType.facebook") || "Facebook",
      site: t("contacts.itemType.site") || "Сайт",
      custom: t("contacts.itemType.custom") || "Другое",
    })[type];

  const typeOptions = (
    ["phone", "email", "telegram", "viber"] as ContactItemType[]
  ).map((v) => ({ label: typeLabel(v), value: v }));

  const visibleSections = useMemo(() => {
    const list = cards
      // считаем undefined как активные, чтобы старые карточки без поля isActive не пропадали
      .filter((c) => (showHidden ? true : c.isActive !== false))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    return list;
  }, [cards, showHidden]);

  const onAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      sort: Math.max(0, cards.length),
      items: [
        { id: `tmp-${Date.now()}`, type: "phone", value: "", isActive: true },
      ],
    });
    setOpen(true);
  };

  const onEdit = (record: ContactCard) => {
    setEditing(record);
    const itemsWithSort = (record.items || []).map((it, idx) => ({
      ...it,
      sort: typeof it.sort === "number" ? it.sort : idx,
    }));
    form.setFieldsValue({
      addressUk: record.addressI18n?.uk || undefined,
      addressEn: record.addressI18n?.en || undefined,
      items: itemsWithSort,
      sort: record.sort,
      isActive: record.isActive,
    });
    setOpen(true);
  };

  const onDelete = (record: ContactCard) => {
    const fallbackLabel =
      record.addressI18n?.uk ||
      record.addressI18n?.en ||
      (record.items || []).find((i) => i.type === "phone")?.value ||
      (record.items || []).find((i) => i.type === "email")?.value ||
      "#";
    const title = t("contacts.msg.delete.title").replace(
      "{label}",
      fallbackLabel
    );
    modal.confirm({
      title,
      okType: "danger",
      okText: t("contacts.msg.delete.ok"),
      cancelText: t("contacts.msg.delete.cancel"),
      async onOk() {
        try {
          await deleteContact(record._id);
          message.success(t("contacts.msg.delete.success"));
          await load();
        } catch {
          message.error(t("contacts.msg.delete.error"));
        }
      },
    });
  };

  const onToggleActive = async (record: ContactCard, next: boolean) => {
    try {
      await updateContact(record._id, { isActive: next });
      setCards((prev) =>
        prev.map((c) => (c._id === record._id ? { ...c, isActive: next } : c))
      );
    } catch {
      message.error(t("contacts.msg.toggleError"));
    }
  };

  const normalizeItems = (items: ContactItem[]): ContactItem[] =>
    items
      .map((i, idx) => ({
        ...i,
        id: i.id || `it-${Date.now()}-${idx}`,
        type: (i.type || "phone") as ContactItemType,
        value: ((): string => {
          const v = (i.value || "").trim();
          switch (i.type) {
            case "telegram":
            case "instagram":
              return v.startsWith("@") ? v : v ? `@${v}` : v;
            case "site":
              return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
            default:
              return v;
          }
        })(),
        label: i.label?.trim() || undefined,
        isActive: typeof i.isActive === "boolean" ? i.isActive : true,
        isPrimary: typeof i.isPrimary === "boolean" ? i.isPrimary : undefined,
        sort:
          typeof i.sort === "number" ? Math.max(0, Math.floor(i.sort)) : idx,
      }))
      .filter((i) => !!i.value);

  const typeIcon = (t: ContactItemType) => {
    switch (t) {
      case "phone":
        return <PhoneOutlined />;
      case "email":
        return <MailOutlined />;
      case "telegram":
        return <SendOutlined />;
      case "viber":
      case "whatsapp":
        return <MessageOutlined />;
      case "site":
        return <GlobalOutlined />;
      case "instagram":
        return <InstagramOutlined />;
      case "facebook":
        return <FacebookOutlined />;
      default:
        return <GlobalOutlined />;
    }
  };

  const moveCard = async (record: ContactCard, direction: -1 | 1) => {
    const ordered = [...cards].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const idx = ordered.findIndex((c) => c._id === record._id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[targetIdx];
    try {
      await Promise.all([
        updateContact(a._id, { sort: b.sort }),
        updateContact(b._id, { sort: a.sort }),
      ]);
      await load();
    } catch {
      message.error(t("contacts.msg.save.error"));
    }
  };

  const onDuplicate = async (record: ContactCard) => {
    try {
      const newItems: ContactItem[] = (record.items || []).map((i, idx) => ({
        ...i,
        id: `dup-${Date.now()}-${idx}`,
      }));
      await createContact({
        addressUk: record.addressI18n?.uk || undefined,
        addressEn: record.addressI18n?.en || undefined,
        items: newItems,
        sort: (cards?.length ?? 0) + 1,
        isActive: record.isActive,
      });
      message.success(t("contacts.msg.save.created"));
      await load();
    } catch {
      message.error(t("contacts.msg.save.error"));
    }
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    const payload: FormValues = {
      addressUk: values.addressUk?.trim() || undefined,
      addressEn: values.addressEn?.trim() || undefined,
      items: normalizeItems(values.items || []),
      sort:
        typeof values.sort === "number"
          ? Math.max(0, Math.floor(values.sort))
          : undefined,
      isActive: values.isActive,
    };
    try {
      if (editing) {
        await updateContact(editing._id, payload);
        message.success(t("contacts.msg.save.updated"));
      } else {
        await createContact(payload);
        message.success(t("contacts.msg.save.created"));
      }
      setOpen(false);
      await load();
    } catch {
      message.error(t("contacts.msg.save.error"));
    }
  };

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        <Alert
          type="info"
          showIcon
          message={
            t("contacts.page.explainer") || "Контакты компании для витрины"
          }
          description={
            t("contacts.page.usage") ||
            "Эта страница показывает, как будет выглядеть раздел «Контакты» на витрине. Редактируйте секции прямо здесь."
          }
        />

        <Space
          align="center"
          wrap>
          <Tooltip title={t("contacts.refresh") || "Обновить"}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void load()}
            />
          </Tooltip>
          <Space>
            <Typography.Text type="secondary">
              {t("contacts.preview.lang") || "Язык предпросмотра"}:
            </Typography.Text>
            <Segmented
              value={previewLang}
              onChange={(v) => setPreviewLang(v as "uk" | "en")}
              options={[
                { label: "Українська", value: "uk" },
                { label: "English", value: "en" },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAdd}>
            {t("contacts.add") || "Добавить карточку"}
          </Button>
          <Button
            icon={showHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowHidden((s) => !s)}>
            {showHidden
              ? t("contacts.preview.hideHidden") || "Скрыть неактивные"
              : t("contacts.preview.showHidden") || "Показать неактивные"}
          </Button>
        </Space>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Empty description={t("common.loading")} />
          </div>
        ) : (
          <Space
            direction="vertical"
            style={{ width: "100%" }}
            size="middle">
            {visibleSections.map((card) => {
              const allItems = (card.items || [])
                .filter((i) => i.isActive !== false)
                .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
              const showMore = expanded[card._id] === true;
              const limit = 6;
              const itemsToShow = showMore
                ? allItems
                : allItems.slice(0, limit);
              const addr =
                (previewLang === "uk"
                  ? card.addressI18n?.uk
                  : card.addressI18n?.en) ||
                card.addressI18n?.uk ||
                card.addressI18n?.en ||
                "—";

              const linkFor = (it: ContactItem): string | undefined => {
                const v = (it.value || "").trim();
                switch (it.type) {
                  case "phone": {
                    const digits = v.replace(/[^+\d]/g, "");
                    return digits ? `tel:${digits}` : undefined;
                  }
                  case "email":
                    return v ? `mailto:${v}` : undefined;
                  case "telegram": {
                    const user = v.replace(/^@/, "");
                    return user ? `https://t.me/${user}` : undefined;
                  }
                  case "viber": {
                    const digits = v.replace(/[^+\d]/g, "");
                    return digits ? `viber://chat?number=${digits}` : undefined;
                  }
                  case "whatsapp": {
                    const digits = v.replace(/[^\d]/g, "");
                    return digits ? `https://wa.me/${digits}` : undefined;
                  }
                  case "instagram": {
                    if (/^https?:\/\//i.test(v)) return v;
                    const user = v.replace(/^@/, "");
                    return user ? `https://instagram.com/${user}` : undefined;
                  }
                  case "facebook":
                    return /^https?:\/\//i.test(v)
                      ? v
                      : v
                        ? `https://facebook.com/${v}`
                        : undefined;
                  case "site":
                    return v || undefined;
                  default:
                    return undefined;
                }
              };

              return (
                <Card
                  key={card._id}
                  bordered
                  style={{ width: "100%", opacity: card.isActive ? 1 : 0.6 }}
                  bodyStyle={{ padding: 16 }}
                  title={
                    <Typography.Title
                      level={4}
                      style={{ margin: 0 }}>
                      {addr}
                    </Typography.Title>
                  }
                  extra={
                    <Space>
                      <Switch
                        checked={card.isActive}
                        onChange={(v) => void onToggleActive(card, v)}
                      />
                      <Button
                        type="link"
                        icon={<ArrowUpOutlined />}
                        onClick={() => void moveCard(card, -1)}
                      />
                      <Button
                        type="link"
                        icon={<ArrowDownOutlined />}
                        onClick={() => void moveCard(card, 1)}
                      />
                      <Button
                        type="link"
                        icon={<CopyOutlined />}
                        onClick={() => onDuplicate(card)}>
                        {t("contacts.actions.duplicate") || "Дублировать"}
                      </Button>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(card)}>
                        {t("common.edit")}
                      </Button>
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(card)}>
                        {t("common.delete")}
                      </Button>
                    </Space>
                  }>
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}>
                    <Space
                      direction="vertical"
                      size={6}>
                      {itemsToShow.map((it, idx) => {
                        const text = it.label || it.value;
                        const href = linkFor(it);
                        return (
                          <Space key={it.id || idx}>
                            {typeIcon(it.type)}
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer">
                                {text}
                              </a>
                            ) : (
                              <span>{text}</span>
                            )}
                            {it.isPrimary ? (
                              <Typography.Text type="secondary">
                                (
                                {t("contacts.form.items.isPrimary") ||
                                  "Основной"}
                                )
                              </Typography.Text>
                            ) : null}
                          </Space>
                        );
                      })}
                    </Space>
                    {allItems.length > limit && (
                      <Button
                        type="link"
                        onClick={() =>
                          setExpanded((m) => ({ ...m, [card._id]: !showMore }))
                        }>
                        {showMore
                          ? t("contacts.preview.showLess") || "Показать меньше"
                          : t("contacts.preview.showMore") || "Показать больше"}
                      </Button>
                    )}
                    <Typography.Paragraph
                      style={{ margin: 0 }}
                      type="secondary">
                      {t("contacts.card.updatedAt") || "Обновлено"}:{" "}
                      {card.updatedAt
                        ? dayjs(card.updatedAt).format("DD.MM.YYYY HH:mm")
                        : "—"}
                    </Typography.Paragraph>
                  </Space>
                </Card>
              );
            })}
            {visibleSections.length === 0 && (
              <Empty
                description={t("contacts.loadEmpty") || "Нет активных секций"}
              />
            )}
          </Space>
        )}
      </Space>

      <Drawer
        title={
          editing
            ? t("contacts.drawer.editTitle")
            : t("contacts.drawer.createTitle")
        }
        open={open}
        onClose={() => setOpen(false)}
        width={860}
        destroyOnClose={false}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>
              {t("contacts.drawer.cancel")}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}>
              {t("contacts.drawer.save")}
            </Button>
          </Space>
        }>
        <Form<FormValues>
          layout="vertical"
          form={form}>
          <Tabs
            items={[
              {
                key: "uk",
                label: t("contacts.form.address.uk") || "Українська",
                children: (
                  <Form.Item
                    label={t("contacts.form.address")}
                    name="addressUk">
                    <Input.TextArea
                      rows={3}
                      placeholder={
                        t("contacts.form.address.placeholder") || "Адреса…"
                      }
                    />
                  </Form.Item>
                ),
              },
              {
                key: "en",
                label: t("contacts.form.address.en") || "English",
                children: (
                  <Form.Item
                    label={t("contacts.form.addressEn")}
                    name="addressEn">
                    <Input.TextArea
                      rows={3}
                      placeholder="Address…"
                    />
                  </Form.Item>
                ),
              },
            ]}
          />

          <Space
            align="baseline"
            style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>
              {t("contacts.form.items.title") || "Контактные элементы"}
            </span>
            <Button
              size="small"
              onClick={() => setBulkOpen(true)}>
              {t("contacts.form.items.bulkAdd") || "Массово"}
            </Button>
          </Space>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: -8 }}>
            {t("contacts.form.items.helper") ||
              "Добавляйте телефоны, email и ссылки на мессенджеры. Эти элементы будут показаны на странице контактов и в футере."}
          </Typography.Paragraph>

          <Space
            style={{ marginBottom: 8 }}
            wrap>
            <span style={{ fontWeight: 500 }}>
              {t("contacts.form.quickAdd") || "Быстро добавить:"}
            </span>
            {(["phone", "email", "telegram", "viber"] as ContactItemType[]).map(
              (tt) => (
                <Button
                  key={tt}
                  size="small"
                  onClick={() => {
                    const cur: ContactItem[] =
                      form.getFieldValue("items") || [];
                    form.setFieldsValue({
                      items: [
                        ...cur,
                        {
                          id: `qa-${Date.now()}-${cur.length}`,
                          type: tt,
                          value: "",
                          isActive: true,
                        },
                      ],
                    });
                  }}>
                  {typeLabel(tt)}
                </Button>
              )
            )}
          </Space>

          <Form.List name="items">
            {(fields, { add, remove, move }) => (
              <Space
                direction="vertical"
                style={{ width: "100%" }}>
                {fields.map((field, idx) => (
                  <div key={field.key}>
                    <Space
                      align="start"
                      wrap
                      style={{ width: "100%" }}>
                      <Form.Item
                        name={[field.name, "type"]}
                        style={{ marginBottom: 0 }}>
                        <Select
                          options={typeOptions}
                          style={{ width: 180 }}
                        />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate>
                        {({ getFieldValue }) => {
                          const currentType: ContactItemType =
                            getFieldValue(["items", field.name, "type"]) ||
                            "phone";
                          return (
                            <Form.Item
                              name={[field.name, "value"]}
                              style={{ marginBottom: 0 }}>
                              <Input
                                style={{ width: 320 }}
                                placeholder={(() => {
                                  switch (currentType) {
                                    case "phone":
                                      return "+380...";
                                    case "email":
                                      return "email@example.com";
                                    case "telegram":
                                      return "@username";
                                    case "viber":
                                      return "+380...";
                                    case "whatsapp":
                                      return "+380...";
                                    case "site":
                                      return "https://example.com";
                                    case "instagram":
                                      return "@account";
                                    case "facebook":
                                      return "https://facebook.com/yourpage";
                                    default:
                                      return (
                                        t("contacts.form.items.value") ||
                                        "Значение"
                                      );
                                  }
                                })()}
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "label"]}
                        style={{ marginBottom: 0 }}>
                        <Input
                          style={{ width: 220 }}
                          placeholder={
                            t("contacts.form.items.label") || "Метка"
                          }
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "isPrimary"]}
                        valuePropName="checked"
                        style={{ marginBottom: 0 }}>
                        <Checkbox>
                          {t("contacts.form.items.isPrimary") || "Основной"}
                        </Checkbox>
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "isActive"]}
                        valuePropName="checked"
                        initialValue
                        style={{ marginBottom: 0 }}>
                        <Switch />
                      </Form.Item>
                      <Space>
                        <Button
                          size="small"
                          icon={<ArrowUpOutlined />}
                          onClick={() => move(idx, Math.max(0, idx - 1))}
                        />
                        <Button
                          size="small"
                          icon={<ArrowDownOutlined />}
                          onClick={() =>
                            move(idx, Math.min(fields.length - 1, idx + 1))
                          }
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      </Space>
                    </Space>
                  </div>
                ))}
                <Button
                  onClick={() =>
                    add({
                      id: `it-${Date.now()}`,
                      type: "phone",
                      value: "",
                      isActive: true,
                    })
                  }>
                  {t("contacts.form.items.add") || "Добавить элемент"}
                </Button>
              </Space>
            )}
          </Form.List>

          <Divider />
          <Typography.Title level={5}>
            {t("contacts.preview.title") || "Предпросмотр"}
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: -8 }}>
            {t("contacts.preview.hint") ||
              "Так будет выглядеть блок на витрине (первые элементы по порядку)."}
          </Typography.Paragraph>
          {(() => {
            const vals = form.getFieldsValue();
            const prevItems: ContactItem[] = normalizeItems(vals.items || []);
            const show = prevItems.slice(0, 5);
            return (
              <Space direction="vertical">
                <Typography.Text strong>
                  {vals.addressUk || vals.addressEn || "—"}
                </Typography.Text>
                {show.map((it, i) => (
                  <Space key={i}>
                    {typeIcon(it.type)} <span>{it.label || it.value}</span>
                  </Space>
                ))}
              </Space>
            );
          })()}

          <Form.Item
            label={t("contacts.form.sort")}
            name="sort"
            initialValue={0}>
            <Input
              type="number"
              min={0}
            />
          </Form.Item>

          <Form.Item
            label={t("contacts.form.isActive")}
            name="isActive"
            valuePropName="checked"
            initialValue>
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={t("contacts.bulk.title") || "Массовое добавление"}
        open={bulkOpen}
        onCancel={() => setBulkOpen(false)}
        onOk={() => {
          const raw = (bulkText || "")
            .split(/\n|,|;|\t/)
            .map((s) => s.trim())
            .filter(Boolean);
          const cur: ContactItem[] = form.getFieldValue("items") || [];
          const toAdd: ContactItem[] = raw.map((v, i) => ({
            id: `bulk-${Date.now()}-${i}`,
            type: bulkType,
            value: v,
            isActive: true,
          }));
          form.setFieldsValue({ items: [...cur, ...toAdd] });
          setBulkText("");
          setBulkOpen(false);
        }}
        okText={t("contacts.bulk.add") || "Добавить"}
        cancelText={t("contacts.bulk.cancel") || t("contacts.drawer.cancel")}>
        <Space
          direction="vertical"
          style={{ width: "100%" }}>
          <Select
            value={bulkType}
            options={typeOptions}
            onChange={(v) => setBulkType(v)}
          />
          <Input.TextArea
            rows={8}
            placeholder={
              t("contacts.bulk.paste") ||
              "Вставьте значения по одному на строку или через запятую"
            }
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
        </Space>
      </Modal>
    </AdminLayout>
  );
}

export default ContactsPage;
