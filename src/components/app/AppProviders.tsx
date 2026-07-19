import { useEffect, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useLicenseStore } from "@/stores/license";
import { useBrandingStore } from "@/stores/branding";

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const locale = useUIStore((s) => s.locale);
  const hydrated = useUIStore((s) => s.hydrated);
  const hydrateUI = useUIStore((s) => s.hydrate);
  const setOnline = useUIStore((s) => s.setOnline);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateLicense = useLicenseStore((s) => s.hydrate);

  // Hydrate UI store from localStorage before any theme-dependent effect runs.
  useEffect(() => {
    hydrateUI();
  }, [hydrateUI]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", locale);
  }, [locale, hydrated]);

  const hydrateBranding = useBrandingStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateLicense();
    void hydrateAuth();
    void hydrateBranding();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [hydrateAuth, hydrateLicense, hydrateBranding, setOnline]);

  return <>{children}</>;
}

