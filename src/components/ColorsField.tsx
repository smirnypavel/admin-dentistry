import { Button, Form, Input, Space } from "antd";

/**
 * Reusable "Кольори" editor (Form.List name="colors").
 * Each row: name (required) + optional HEX + live swatch preview.
 * Must be rendered inside an Ant Design <Form>.
 */
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
                  style={{ width: 240, marginBottom: 0 }}
                >
                  <Input placeholder="Напр. Червоний / Neon Pink" />
                </Form.Item>
                <Form.Item {...rest} name={[fname, "hex"]} style={{ width: 160, marginBottom: 0 }}>
                  <Input placeholder="#22c55e (необов'язково)" allowClear />
                </Form.Item>
                <Form.Item shouldUpdate style={{ marginBottom: 0 }}>
                  {() => {
                    const hex = form.getFieldValue([name, fname, "hex"]);
                    return (
                      <span
                        style={{
                          display: "inline-block",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "1px solid #d6d3d1",
                          background: hex || "#f5f5f4",
                          verticalAlign: "middle",
                        }}
                      />
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
