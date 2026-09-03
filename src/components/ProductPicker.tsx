import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select, Spin } from "antd";
import { listProducts, type Product } from "../api/products";

type Option = { value: string; label: string };

/**
 * Searchable multi-select for picking products by id.
 * - Types are searched server-side (substring match).
 * - Already-selected ids are resolved to titles on mount so they render as tags.
 */
export function ProductPicker({
  value,
  onChange,
  excludeId,
  placeholder = "Почніть вводити назву товару…",
}: {
  value?: string[];
  onChange?: (ids: string[]) => void;
  excludeId?: string;
  placeholder?: string;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [fetching, setFetching] = useState(false);
  const titles = useRef<Map<string, string>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toOption = useCallback((p: Product): Option => {
    const label = `${p.title || p.slug}${p.slug ? ` (${p.slug})` : ""}`;
    titles.current.set(p._id, label);
    return { value: p._id, label };
  }, []);

  // Resolve titles for the currently selected ids (once, and when new unknown ids appear).
  useEffect(() => {
    const missing = (value ?? []).filter((id) => !titles.current.has(id));
    if (!missing.length) return;
    let alive = true;
    listProducts({ ids: missing, limit: Math.min(missing.length, 50) })
      .then((res) => {
        if (!alive) return;
        res.items.forEach(toOption);
        // force re-render so labels appear
        setOptions((prev) => [...prev]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, toOption]);

  const runSearch = useCallback(
    (term: string) => {
      setFetching(true);
      listProducts({ qLike: term.trim() || undefined, limit: 20, sort: "-createdAt" })
        .then((res) => {
          setOptions(res.items.filter((p) => p._id !== excludeId).map(toOption));
        })
        .catch(() => setOptions([]))
        .finally(() => setFetching(false));
    },
    [excludeId, toOption],
  );

  const onSearch = useCallback(
    (term: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runSearch(term), 300);
    },
    [runSearch],
  );

  // Load an initial batch of recent products when opened with no query.
  const onFocus = useCallback(() => {
    if (!options.length) runSearch("");
  }, [options.length, runSearch]);

  // Merge selected (so tags keep labels) with the current search options.
  const mergedOptions = useMemo(() => {
    const map = new Map<string, Option>();
    (value ?? []).forEach((id) => {
      map.set(id, { value: id, label: titles.current.get(id) || id });
    });
    options.forEach((o) => map.set(o.value, o));
    return Array.from(map.values());
  }, [options, value]);

  return (
    <Select
      mode="multiple"
      allowClear
      value={value}
      onChange={(v) => onChange?.(v as string[])}
      placeholder={placeholder}
      filterOption={false}
      onSearch={onSearch}
      onFocus={onFocus}
      notFoundContent={fetching ? <Spin size="small" /> : "Нічого не знайдено"}
      options={mergedOptions}
      style={{ width: "100%" }}
    />
  );
}
