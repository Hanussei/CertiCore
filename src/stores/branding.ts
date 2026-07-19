import { create } from "zustand";
import type { Branding } from "@/types";
import {
  DEFAULT_BRANDING,
  getBranding,
  resetBranding as bridgeReset,
  saveBranding as bridgeSave,
  uploadLogo as bridgeUpload,
} from "@/lib/bridge/branding";

type BrandingState = {
  branding: Branding;
  status: "idle" | "loading" | "ready" | "saving";
  dirty: boolean;
  hydrate: () => Promise<void>;
  patch: (partial: Partial<Branding>) => void;
  save: () => Promise<boolean>;
  reset: () => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
};

export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: DEFAULT_BRANDING,
  status: "idle",
  dirty: false,
  hydrate: async () => {
    set({ status: "loading" });
    const res = await getBranding();
    set({ branding: res.ok ? res.data : DEFAULT_BRANDING, status: "ready", dirty: false });
  },
  patch: (partial) => {
    set({ branding: { ...get().branding, ...partial }, dirty: true });
  },
  save: async () => {
    set({ status: "saving" });
    try {
      const res = await bridgeSave(get().branding);
      if (!res.ok) {
        set({ status: "ready" });
        return false;
      }
      set({ branding: res.data, status: "ready", dirty: false });
      return true;
    } catch (err) {
      console.error("Failed to save branding:", err);
      set({ status: "ready" });
      return false;
    }
  },
  reset: async () => {
    const res = await bridgeReset();
    set({ branding: res.ok ? res.data : DEFAULT_BRANDING, dirty: false, status: "ready" });
  },
  uploadLogo: async (file) => {
    const res = await bridgeUpload(file);
    if (!res.ok) return null;
    set({ branding: { ...get().branding, logoDataUrl: res.data }, dirty: true });
    return res.data;
  },
}));
