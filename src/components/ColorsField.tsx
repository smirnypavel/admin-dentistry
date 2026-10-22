import { Button, Form, Input, Space, Tooltip } from "antd";
import type { CSSProperties } from "react";

/**
 * Reusable "Кольори" editor (Form.List name="colors").
 * Each row: name (required) + primary HEX + optional SECOND colour (two-tone).
 *
 * Two-tone colours are stored in the single `hex` field as "primary/secondary"
 * (e.g. "#22c55e/#3b82f6") — so no backend change is needed; the storefront
 * splits it on "/" and renders a two-tone swatch.
 *
 * Must be rendered inside an Ant Design <Form>.
 */
const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
const partsOf = (hex?: unknown): [string, string] => {
  const [a = "", b = ""] = String(hex ?? "")
    .split("/")
    .map((s) => s.trim());
  return [a, b];
};

const swatch: CSSProperties = {
  display: "block",
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: "1px solid #d6d3d1",
};
const swatchLabel: CSSProperties = {
  position: "relative",
  display: "inline-block",
  width: 26,
  height: 26,
  verticalAlign: "middle",
  cursor: "pointer",
};
const hiddenColor: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
};

export function ColorsField({
  label = "Кольори",
  tooltip,
  name = "colors",
}: {
  label?: string;
  tooltip?: string;
  name?: string;
}) {
  const form = Form.useFormInstance();
  const setCombined = (fname: number, a: string, b: string) => {
    const val = b ? `${a || "#000000"}/${b}` : a;
    form.setFieldValue([name, fname, "hex"], val);
  };
  return (
    <Form.Item label={label} tooltip={tooltip}>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map(({ key, name: fname, ...rest }) => (
              <Space key={key} align="baseline" wrap>
                <Form.Item
                  {...rest}
                  name={[fname, "name"]}
                  rules={[{ required: true, message: "Вкажіть назву кольору" }]}
                  style={{ width: 220, marginBottom: 0 }}
                >
                  <Input placeholder="Напр. Червоний / Neon Pink" />
                </Form.Item>

                <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                  {() => {
                    const [a, b] = partsOf(form.getFieldValue([name, fname, "hex"]));
                    const aValid = isHex(a);
                    const bValid = isHex(b);
                    return (
                      <Space align="center" size={8} wrap>
                        {/* primary HEX text input */}
                        <Input
                          value={a}
                          placeholder="#22c55e"
                          allowClear
                          onChange={(e) => setCombined(fname, e.target.value, b)}
                          style={{ width: 130 }}
                        />
                        {/* primary swatch (native colour picker) */}
                        <Tooltip title="Основний колір">
                          <label style={swatchLabel}>
                            <span style={{ ...swatch, background: aValid ? a : "#f5f5f4" }} />
                            <input
                              type="color"
                              value={aValid ? a : "#22c55e"}
                              onChange={(e) => setCombined(fname, e.target.value, b)}
                              style={hiddenColor}
                            />
                          </label>
                        </Tooltip>

                        {/* second colour (two-tone) */}
                        {bValid ? (
                          <Space size={2} align="center">
                            <Tooltip title="Другий колір (двоколірний)">
                              <label style={swatchLabel}>
                                <span style={{ ...swatch, background: b }} />
                                <input
                                  type="color"
                                  value={b}
                                  onChange={(e) => setCombined(fname, a, e.target.value)}
                                  style={hiddenColor}
                                />
                              </label>
                            </Tooltip>
                            <Tooltip title="Прибрати другий колір">
                              <Button size="small" type="text" danger onClick={() => setCombined(fname, a, "")}>
                                ×
                              </Button>
                            </Tooltip>
                            {/* combined preview */}
                            <span
                              title="Як виглядатиме на сайті"
                              style={{
                                ...swatch,
                                background: `linear-gradient(135deg, ${a || "#000000"} 0 50%, ${b} 50% 100%)`,
                              }}
                            />
                          </Space>
                        ) : (
                          <Tooltip title="Додати другий колір (для двоколірних)">
                            <label style={swatchLabel}>
                              <span
                                style={{
                                  ...swatch,
                                  background: "#fff",
                                  border: "1px dashed #a8a29e",
                                  color: "#a8a29e",
                                  textAlign: "center",
                                  fontSize: 16,
                                  lineHeight: "24px",
                                }}
                              >
                                +
                              </span>
                              <input
                                type="color"
                                value="#3b82f6"
                                onChange={(e) => setCombined(fname, a || "#22c55e", e.target.value)}
                                style={hiddenColor}
                              />
                            </label>
                          </Tooltip>
                        )}
                      </Space>
                    );
                  }}
                </Form.Item>

                <Button danger onClick={() => remove(fname)}>
                  Видалити
                </Button>
              </Space>
            ))}
            <Button onClick={() => add({ name: "", hex: "" })}>Додати колір</Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  );
}
