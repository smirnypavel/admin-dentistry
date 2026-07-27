import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useQueryParam(key: string, initial = "", debounceMs = 300) {
  const [params, setParams] = useSearchParams();
  const initialFromUrl = params.get(key) ?? initial;
  const [value, setValue] = useState<string>(initialFromUrl);
  const timerRef = useRef<number | null>(null);

  // Keep state in sync if URL changes externally
  // Important: depend ONLY on params/key so typing locally doesn't get overwritten
  useEffect(() => {
    const fromUrl = params.get(key) ?? "";
    setValue(fromUrl);
  }, [params, key]);

  const set = useMemo(() => {
    return (next: string) => {
      setValue(next);
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
