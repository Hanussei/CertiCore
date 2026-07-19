import { create } from "zustand";
import type { Standard } from "@/types";
import {
  deleteStandard,
  listStandards,
  upsertStandard,
} from "@/lib/bridge/standards";

type StandardsState = {
  items: Standard[];
  status: "idle" | "loading" | "ready" | "saving";
  hydrate: () => Promise<void>;
  upsert: (std: Standard) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => Standard | undefined;
  byCode: (code: string) => Standard | undefined;
};

export const useStandardsStore = create<StandardsState>((set, get) => ({
  items: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listStandards();
    set({ items: res.ok ? res.data : [], status: "ready" });
  },
  upsert: async (std) => {
    set({ status: "saving" });
    const res = await upsertStandard(std);
    if (!res.ok) {
      set({ status: "ready" });
      return false;
    }
    const list = get().items;
    const exists = list.some((s) => s.id === std.id);
    set({
      items: exists ? list.map((s) => (s.id === std.id ? std : s)) : [...list, std],
      status: "ready",
    });
    return true;
  },
  remove: async (id) => {
    await deleteStandard(id);
    set({ items: get().items.filter((s) => s.id !== id) });
  },
  byId: (id) => get().items.find((s) => s.id === id),
  byCode: (code) => get().items.find((s) => s.code === code),
}));
