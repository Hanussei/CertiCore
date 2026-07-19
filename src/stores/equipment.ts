import { create } from "zustand";
import type { Equipment } from "@/types";
import {
  deleteEquipment,
  type EquipmentDraft,
  listEquipment,
  upsertEquipment,
} from "@/lib/bridge/equipment";

type EquipmentState = {
  items: Equipment[];
  status: "idle" | "loading" | "ready" | "saving";
  hydrate: () => Promise<void>;
  upsert: (draft: EquipmentDraft) => Promise<{ ok: boolean; message?: string }>;
  remove: (id: string) => Promise<void>;
};

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  items: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listEquipment();
    set({ items: res.ok ? res.data : [], status: "ready" });
  },
  upsert: async (draft) => {
    set({ status: "saving" });
    const res = await upsertEquipment(draft);
    if (!res.ok) {
      set({ status: "ready" });
      return { ok: false, message: res.error.message };
    }
    const list = get().items;
    const exists = list.some((e) => e.id === res.data.id);
    set({
      items: exists ? list.map((e) => (e.id === res.data.id ? res.data : e)) : [...list, res.data],
      status: "ready",
    });
    return { ok: true };
  },
  remove: async (id) => {
    await deleteEquipment(id);
    set({ items: get().items.filter((e) => e.id !== id) });
  },
}));
