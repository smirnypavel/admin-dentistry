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
        // Base the write on the LIVE URL (window.location.search), not on
        // react-router's `prev`. When several filters change in one handler
        // (e.g. category also resets subcategory + page), their timers fire
        // sequentially and history.replaceState updates window.location
        // synchronously between them — so reading it here lets the writes
        // merge instead of clobbering each other. react-router's functional
        // updater does NOT chain across these batched calls, which caused the
        // "category applies only on the second try" bug (the last setter won).
        const newParams = new URLSearchParams(window.location.search);
        if (next && next.trim()) newParams.set(key, next.trim());
        else newParams.delete(key);
        setParams(newParams, { replace: true });
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
