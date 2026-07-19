import { create } from "zustand";

export type Theme = "light" | "dark";
export type Locale = "en" | "ar";

type UIState = {
  theme: Theme;
  locale: Locale;
  hydrated: boolean;
  sidebarCollapsed: boolean;
  online: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  toggleSidebar: () => void;
  setOnline: (v: boolean) => void;
  hydrate: () => void;
};

const THEME_KEY = "certicore.theme.v1";
const LOCALE_KEY = "certicore.locale.v1";

function readStored<T extends string>(key: string, allowed: T[]): T | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(key);
  return (allowed as string[]).includes(v ?? "") ? (v as T) : null;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Deterministic SSR values — real values hydrate from localStorage on the client.
  theme: "dark",
  locale: "en",
  hydrated: false,
  sidebarCollapsed: false,
  online: true,
  setTheme: (theme) => {
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  setLocale: (locale) => {
    if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_KEY, locale);
    set({ locale });
  },
  toggleLocale: () => get().setLocale(get().locale === "en" ? "ar" : "en"),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setOnline: (online) => set({ online }),
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const theme = readStored<Theme>(THEME_KEY, ["light", "dark"]) ?? get().theme;
    const locale = readStored<Locale>(LOCALE_KEY, ["en", "ar"]) ?? get().locale;
    set({ theme, locale, online: navigator.onLine, hydrated: true });
  },
}));

