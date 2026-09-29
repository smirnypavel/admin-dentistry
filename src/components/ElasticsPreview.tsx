import { Form } from "antd";

type Entry = {
  group?: string;
  size?: string;
  mm?: number | string;
  forceName?: string;
  oz?: string;
  g?: string;
  level?: number | string;
  animal?: string;
  art?: string;
  colorArt?: string;
};

/** Live pivoted preview of the elastics matrix (rows = size, cols = force),
 *  exactly how the storefront groups the flat rows. Read-only. */
export function ElasticsPreview() {
  const raw = (Form.useWatch<Entry[]>("elasticsEntries") || []) as Entry[];
  const entries = raw.filter(
    (e) => e && (e.animal || "").trim() && (e.size || "").trim(),
  );

  if (!entries.length) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: "24px 16px",
          textAlign: "center",
          color: "#a8a29e",
          border: "1px dashed #d6d3d1",
          borderRadius: 12,
          background: "#fafaf9",
        }}
      >
        Тут зʼявиться попередній вигляд таблиці, щойно ви додасте рядки.
      </div>
    );
  }

  const groups = [
    { key: "intra", label: "Внутрішньоротові" },
    { key: "extra", label: "Позаротові" },
  ].filter((g) => entries.some((e) => (e.group || "intra") === g.key));

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        👁 Так це виглядатиме на сайті (спрощено)
      </div>
      <div style={{ fontSize: 12, color: "#78716c", marginBottom: 12 }}>
        Рядки — це розміри, стовпці — сила тяги, а на перетині — тварина з
        артикулом (те, що покупець додасть у кошик).
      </div>
      {groups.map((g) => {
        const ge = entries.filter((e) => (e.group || "intra") === g.key);
        const sizes = [
          ...new Map(
            ge.map((e) => [e.size, { size: e.size!, mm: Number(e.mm) || 0 }]),
          ).values(),
        ].sort((a, b) => a.mm - b.mm);
        const forces = [
          ...new Map(
            ge.map((e) => [
              e.forceName,
              {
                name: e.forceName || "",
                oz: e.oz || "",
                g: e.g || "",
                level: Number(e.level) || 1,
              },
            ]),
          ).values(),
        ].sort((a, b) => a.level - b.level);
        const cell: Record<string, Record<string, Entry>> = {};
        ge.forEach((e) => {
          (cell[e.size!] ||= {})[e.forceName || ""] = e;
        });

        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#0369a1",
                margin: "6px 0",
              }}
            >
              {g.label}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 6 }}>
                <thead>
                  <tr>
                    <th />
                    {forces.map((f) => (
                      <th
                        key={f.name}
                        style={{
                          background: "#1c1917",
                          color: "#fff",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          minWidth: 108,
                          textAlign: "center",
                        }}
                      >
                        {f.name}
                        <div style={{ opacity: 0.7, fontWeight: 400 }}>
                          {f.oz} · {f.g}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s) => (
                    <tr key={s.size}>
                      <td
                        style={{
                          background: "#f5f5f4",
                          border: "1px solid #e7e5e4",
                          borderRadius: 8,
                          padding: "6px 10px",
                          textAlign: "center",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.size}
                        <div
                          style={{ fontSize: 10, color: "#78716c", fontWeight: 400 }}
                        >
                          {s.mm} мм
                        </div>
                      </td>
                      {forces.map((f) => {
                        const e = cell[s.size!]?.[f.name];
                        return (
                          <td
                            key={f.name}
                            style={{
                              border: "1px solid #e7e5e4",
                              borderRadius: 8,
                              padding: "6px 10px",
                              minWidth: 108,
                              background: e ? "#fff" : "#fafaf9",
                              verticalAlign: "top",
                            }}
                          >
                            {e ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>
                                  {e.animal}
                                  {e.colorArt ? " 🎨" : ""}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#a8a29e",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {e.art}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "#d6d3d1" }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
