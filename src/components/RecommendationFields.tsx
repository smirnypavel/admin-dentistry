import { Divider, Form, Select } from "antd";
import { ProductPicker } from "./ProductPicker";
import type { Category } from "../api/categories";
import type { Subcategory } from "../api/subcategories";

/**
 * Three-way "recommended products" source, rendered as Form.Items:
 *  - relatedProductIds     — specific products (highest priority)
 *  - relatedSubcategoryId  — a whole subcategory
 *  - relatedCategoryId     — a whole category
 * Must be used inside an Ant Design <Form>.
 */
export function RecommendationFields({
  categories,
  subcategories,
  excludeProductId,
  title = "Рекомендовані товари",
  scopeHint,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  excludeProductId?: string;
  title?: string;
  scopeHint?: string;
}) {
  const subOptions = [...subcategories]
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "uk"))
    .map((s) => {
      const cat = categories.find((c) => c._id === s.categoryId)?.name || "?";
      const parent = s.parentSubcategoryId
        ? subcategories.find((p) => p._id === s.parentSubcategoryId)
        : undefined;
      const label = parent
        ? `${parent.name} → ${s.name} (${cat})`
        : `${s.name} (${cat})`;
      return { value: s._id, label };
    });
  const catOptions = categories.map((c) => ({ value: c._id, label: c.name }));

  return (
    <>
      <Divider orientation="left" orientationMargin={0} style={{ fontSize: 12, color: "#78716c" }}>
        {title}
      </Divider>
      <div style={{ fontSize: 12, color: "#78716c", marginBottom: 12 }}>
        {scopeHint ? scopeHint + " " : ""}
        Пріоритет: конкретні товари → підкатегорія → категорія. Заповніть лише
        один варіант; решта — запасні.
      </div>
      <Form.Item label="Конкретні товари" name="relatedProductIds">
        <ProductPicker excludeId={excludeProductId} />
      </Form.Item>
      <Form.Item label="… або вся підкатегорія" name="relatedSubcategoryId">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="— не обрано"
          options={subOptions}
        />
      </Form.Item>
      <Form.Item label="… або вся категорія" name="relatedCategoryId">
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="— не обрано"
          options={catOptions}
        />
      </Form.Item>
    </>
  );
}
