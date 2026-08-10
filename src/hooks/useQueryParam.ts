import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryParam(key: string, initial = "", debounceMs = 300) {
  const [params, setParams] = useSearchParams();
  const initialFromUrl = params.get(key) ?? initial;
  const [value, setValue] = useState<string>(initialFromUrl);
  const timerRef = useRef<number | null>(null);
  // True while a locally-set value hasn't been written to the URL yet.
  const pendingRef = useRef(false);

  // Keep state in sync if the URL changes externally (back/forward).
  // Skip while a local edit is pending, otherwise an unrelated params change
  // (e.g. another filter writing to the URL) would clobber the value the user
  // just picked — which showed up as "selects only on the second try".
  useEffect(() => {
    if (pendingRef.current) return;
    const fromUrl = params.get(key) ?? "";
    setValue(fromUrl);
  }, [params, key]);

  const set = useMemo(() => {
    return (next: string) => {
      setValue(next);
      pendingRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        // Functional updater so concurrent writes (e.g. page + pageSize)
        // merge against the latest params instead of clobbering each other.
        setParams(
          (prev) => {
            const newParams = new URLSearchParams(prev);
            if (next && next.trim()) newParams.set(key, next.trim());
            else newParams.delete(key);
            return newParams;
          },
          { replace: true },
        );
        pendingRef.current = false;
      }, debounceMs);
    };
  }, [setParams, key, debounceMs]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return [value, set] as const;
}
