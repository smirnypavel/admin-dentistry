import { useState } from "react";
import { Upload, Image, App as AntApp, Space, Button } from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { uploadImage } from "../api/uploads";
import { useI18n } from "../store/i18n";

type Props = {
  value?: string | null;
  onChange?: (url: string | null) => void;
  folder?: string; // e.g., 'categories'
  disabled?: boolean;
  accept?: string[]; // e.g., ['image/jpeg','image/png']
  maxSizeMB?: number; // e.g., 2
};

export function ImageUploader({
  value,
  onChange,
  folder = "categories",
  disabled,
  accept = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 2,
}: Props) {
  const { t } = useI18n();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const beforeUpload: UploadProps["beforeUpload"] = async (file) => {
    // Basic client validation
    const mimeOk = accept.length === 0 || accept.includes(file.type);
    const sizeOk = maxSizeMB ? file.size / (1024 * 1024) <= maxSizeMB : true;
    if (!mimeOk) {
      message.error(t("uploader.typeError"));
      return false;
    }
    if (!sizeOk) {
      message.error(t("uploader.sizeError").replace("{mb}", String(maxSizeMB)));
      return false;
    }
    setLoading(true);
    try {
      const res = await uploadImage(file as unknown as File, folder);
      onChange?.(res.secure_url || res.url);
      message.success(t("uploader.success"));
    } catch {
      message.error(t("uploader.error"));
    } finally {
      setLoading(false);
    }
    return false; // prevent antd from auto-uploading
  };

  return (
    <Space direction="vertical">
      {value ? (
        <Space>
          <Image
            src={value}
            width={120}
            height={120}
            style={{ objectFit: "cover" }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onChange?.(null)}
            disabled={disabled || loading}>
            {t("uploader.delete")}
          </Button>
        </Space>
      ) : null}
      <Upload
        multiple={false}
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={disabled || loading}>
        <Button
          icon={<UploadOutlined />}
          loading={loading}
          disabled={disabled}>
          {value ? t("uploader.replace") : t("uploader.upload")}
        </Button>
      </Upload>
    </Space>
  );
}
