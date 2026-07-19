import { useCallback } from "react";
import { useUIStore } from "@/stores/ui";
import { translate } from "@/lib/i18n/dict";

export function useT() {
  const locale = useUIStore((s) => s.locale);
  return useCallback(
    (key: string, vars?: Record<string, string>) => translate(locale, key, vars),
    [locale],
  );
}

export function useLocale() {
  return useUIStore((s) => s.locale);
}

export function useDir() {
  return useUIStore((s) => (s.locale === "ar" ? "rtl" : "ltr"));
}
