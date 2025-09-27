import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Switch,
  Tabs,
  Space,
  Select,
  Typography,
  Divider,
  Card,
  Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { ImageUploader } from "../components/ImageUploader";
import {
  getHeroLatest,
  createHero,
  updateHero,
  deleteHero,
  type Hero,
} from "../api/hero";
import { useI18n } from "../store/i18n";

type FormValues = {
  titleUk?: string;
  titleEn?: string;
  subtitleUk?: string;
  subtitleEn?: string;
  imageUrl?: string;
  imageUrlMobile?: string;
  videoUrl?: string;
  ctaLabelUk?: string;
  ctaLabelEn?: string;
  ctaUrl?: string;
  ctaExternal?: boolean;
  theme?: "light" | "dark";
  isActive?: boolean;
};

export function HeroPage() {
  const { message, modal } = AntApp.useApp();
  const { t } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Hero | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getHeroLatest();
      setCurrent(data);
      form.setFieldsValue(
        data
          ? {
              titleUk: data.titleI18n?.uk,
              titleEn: data.titleI18n?.en,
              subtitleUk: data.subtitleI18n?.uk,
              subtitleEn: data.subtitleI18n?.en,
              imageUrl: data.imageUrl || undefined,
              imageUrlMobile: data.imageUrlMobile || undefined,
              videoUrl: data.videoUrl || undefined,
              ctaLabelUk: data.cta?.labelI18n?.uk,
              ctaLabelEn: data.cta?.labelI18n?.en,
              ctaUrl: data.cta?.url || undefined,
              ctaExternal: data.cta?.external ?? false,
              theme: data.theme || "light",
              isActive: data.isActive ?? false,
            }
          : { theme: "light", isActive: false }
      );
    } catch {
      message.error(t("hero.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    const v = await form.validateFields();
    const payload = {
      titleI18n:
        v.titleUk || v.titleEn ? { uk: v.titleUk, en: v.titleEn } : undefined,
      subtitleI18n:
        v.subtitleUk || v.subtitleEn
          ? { uk: v.subtitleUk, en: v.subtitleEn }
          : undefined,
      imageUrl: v.imageUrl?.trim() || undefined,
      imageUrlMobile: v.imageUrlMobile?.trim() || undefined,
      videoUrl: v.videoUrl?.trim() || undefined,
      cta: {
        labelI18n:
          v.ctaLabelUk || v.ctaLabelEn
            ? { uk: v.ctaLabelUk, en: v.ctaLabelEn }
            : undefined,
        url: v.ctaUrl?.trim() || undefined,
        external: v.ctaExternal ?? false,
      },
      theme: v.theme || "light",
      isActive: !!v.isActive,
    } as const;
    try {
      if (current?._id) await updateHero(current._id, payload);
      else await createHero(payload);
      message.success(t("hero.save.success"));
      await load();
    } catch {
      message.error(t("hero.save.error"));
    }
  };

  const onDelete = async () => {
    if (!current?._id) return;
    modal.confirm({
      title: t("hero.delete.confirmTitle"),
      okType: "danger",
      async onOk() {
        try {
          await deleteHero(current._id);
          setCurrent(null);
          form.resetFields();
          message.success(t("hero.delete.success"));
        } catch {
          message.error(t("hero.delete.error"));
        }
      },
    });
  };

  const preview = useMemo(() => {
    const v = form.getFieldsValue();
    const theme = v.theme || "light";
    return (
      <Card
        bordered
        style={{
          background: theme === "dark" ? "#101418" : "#f8fafb",
          color: theme === "dark" ? "#fff" : "#111",
        }}
        bodyStyle={{ display: "grid", gap: 12 }}>
        <div>
          <Typography.Title
            level={3}
            style={{ margin: 0, color: "inherit" }}>
            {v.titleUk || v.titleEn || t("hero.preview.placeholder.title")}
          </Typography.Title>
          {(v.subtitleUk || v.subtitleEn) && (
            <Typography.Paragraph style={{ margin: 0, opacity: 0.8 }}>
              {v.subtitleUk || v.subtitleEn}
            </Typography.Paragraph>
          )}
        </div>
        {(v.imageUrl || v.imageUrlMobile) && (
          <Space size={12}>
            {v.imageUrl && (
              <img
                src={v.imageUrl}
                alt="desktop"
                style={{ maxWidth: 240, maxHeight: 120, objectFit: "cover" }}
              />
            )}
            {v.imageUrlMobile && (
              <img
                src={v.imageUrlMobile}
                alt="mobile"
                style={{ maxWidth: 120, maxHeight: 120, objectFit: "cover" }}
              />
            )}
          </Space>
        )}
        {(v.ctaLabelUk || v.ctaLabelEn) && (
          <Button
            type="primary"
            href={v.ctaUrl}
            target={v.ctaExternal ? "_blank" : undefined}>
            {v.ctaLabelUk || v.ctaLabelEn}
          </Button>
        )}
      </Card>
    );
  }, [form, t]);

  return (
    <AdminLayout>
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size="large">
        <Space>
          <Button
            type="primary"
            onClick={() => void onSave()}
            loading={loading}>
            {t("hero.actions.save")}
          </Button>
          <Button
            onClick={() => void load()}
            disabled={loading}>
            {t("hero.actions.refresh")}
          </Button>
          <Button
            danger
            onClick={() => void onDelete()}
            disabled={!current?._id}>
            {t("hero.actions.delete")}
          </Button>
        </Space>

        <Form<FormValues>
          layout="vertical"
          form={form}
          disabled={loading}>
          <Tabs
            items={[
              {
                key: "uk",
                label: t("hero.tabs.uk"),
                children: (
                  <>
                    <Form.Item
                      label={t("hero.form.title.uk")}
                      name="titleUk">
                      <Input
                        placeholder={t("hero.form.title.uk.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("hero.form.subtitle.uk")}
                      name="subtitleUk">
                      <Input.TextArea
                        rows={3}
                        placeholder={t("hero.form.subtitle.uk.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("hero.form.ctaLabel.uk")}
                      name="ctaLabelUk">
                      <Input
                        placeholder={t("hero.form.ctaLabel.uk.placeholder")}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: "en",
                label: t("hero.tabs.en"),
                children: (
                  <>
                    <Form.Item
                      label={t("hero.form.title.en")}
                      name="titleEn">
                      <Input
                        placeholder={t("hero.form.title.en.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("hero.form.subtitle.en")}
                      name="subtitleEn">
                      <Input.TextArea
                        rows={3}
                        placeholder={t("hero.form.subtitle.en.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t("hero.form.ctaLabel.en")}
                      name="ctaLabelEn">
                      <Input
                        placeholder={t("hero.form.ctaLabel.en.placeholder")}
                      />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Divider />

          <Space wrap>
            <Form.Item
              label={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                  {t("hero.form.image.desktop")}
                  <Tooltip title={t("hero.form.image.desktop.hint")}>
                    <InfoCircleOutlined style={{ color: "#999" }} />
                  </Tooltip>
                </span>
              }
              name="imageUrl"
              valuePropName="value">
              <ImageUploader
                folder="hero"
                accept={["image/jpeg", "image/png", "image/webp"]}
                maxSizeMB={2}
              />
            </Form.Item>
            <Form.Item
              label={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                  {t("hero.form.image.mobile")}
                  <Tooltip title={t("hero.form.image.mobile.hint")}>
                    <InfoCircleOutlined style={{ color: "#999" }} />
                  </Tooltip>
                </span>
              }
              name="imageUrlMobile"
              valuePropName="value">
              <ImageUploader
                folder="hero"
                accept={["image/jpeg", "image/png", "image/webp"]}
                maxSizeMB={2}
              />
            </Form.Item>
            <Form.Item
              label={t("hero.form.video")}
              name="videoUrl">
              <Input placeholder={t("hero.form.video.placeholder")} />
            </Form.Item>
          </Space>

          <Space wrap>
            <Form.Item
              label={t("hero.form.cta.url")}
              name="ctaUrl">
              <Input placeholder={t("hero.form.cta.url.placeholder")} />
            </Form.Item>
            <Form.Item
              label={t("hero.form.cta.external")}
              name="ctaExternal"
              valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              label={t("hero.form.theme")}
              name="theme"
              initialValue="light">
              <Select
                options={[
                  { label: t("hero.form.theme.light"), value: "light" },
                  { label: t("hero.form.theme.dark"), value: "dark" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t("hero.form.isActive")}
              name="isActive"
              valuePropName="checked"
              initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>

          <Divider />
          <Typography.Title level={5}>
            {t("hero.preview.title")}
          </Typography.Title>
          {preview}
        </Form>
      </Space>
    </AdminLayout>
  );
}

export default HeroPage;
