import { create } from "zustand";
import type { License } from "@/lib/bridge/license";
import {
  activate as bridgeActivate,
  deactivate as bridgeDeactivate,
  getLicense,
} from "@/lib/bridge/license";

type LicenseState = {
  license: License | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  hydrate: () => Promise<void>;
  activate: (code: string) => Promise<boolean>;
  deactivate: () => Promise<void>;
};

export const useLicenseStore = create<LicenseState>((set) => ({
  license: null,
  status: "idle",
  error: null,
  hydrate: async () => {
    set({ status: "loading" });
    const res = await getLicense();
    let license = res.ok ? res.data : null;

    // Set local license immediately so the app opens instantly without waiting for network!
    set({ license, status: "ready" });

    if (license && typeof window !== "undefined" && navigator.onLine) {
      // Run the network validation in the background asynchronously
      void (async () => {
        try {
          const { verifyLicenseOnline } = await import("@/lib/bridge/license");
          const check = await verifyLicenseOnline(license!.code);
          if (check.ok && check.data === false) {
            // License key was deleted or expired in the database! Clear it locally.
            await bridgeDeactivate();
            set({ license: null });
            // Reload the app window to route them to activation screen
            window.location.reload();
          }
        } catch (e) {
          console.warn("Background license validation failed", e);
        }
      })();
    }
  },
  activate: async (code) => {
    set({ status: "loading", error: null });
    const res = await bridgeActivate(code);
    if (!res.ok) {
      set({ status: "ready", error: res.error.message });
      return false;
    }
    set({ license: res.data, status: "ready", error: null });
    return true;
  },
  deactivate: async () => {
    await bridgeDeactivate();
    set({ license: null });
  },
}));
