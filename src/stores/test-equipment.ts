import { create } from "zustand";
import type { TestEquipment } from "@/types";
import {
  deleteTestEquipment,
  listTestEquipment,
  upsertTestEquipment,
} from "@/lib/bridge/test-equipment";

type TestEquipmentState = {
  items: TestEquipment[];
  status: "idle" | "loading" | "ready" | "saving";
  hydrate: () => Promise<void>;
  upsert: (te: TestEquipment) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => TestEquipment | undefined;
};

export const useTestEquipmentStore = create<TestEquipmentState>((set, get) => ({
  items: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listTestEquipment();
    set({ items: res.ok ? res.data : [], status: "ready" });
  },
  upsert: async (te) => {
    set({ status: "saving" });
    const res = await upsertTestEquipment(te);
    if (!res.ok) {
      set({ status: "ready" });
      return false;
    }
    const list = get().items;
    const exists = list.some((t) => t.id === te.id);
    set({
      items: exists ? list.map((t) => (t.id === te.id ? te : t)) : [...list, te],
      status: "ready",
    });
    return true;
  },
  remove: async (id) => {
    await deleteTestEquipment(id);
    set({ items: get().items.filter((t) => t.id !== id) });
  },
  byId: (id) => get().items.find((t) => t.id === id),
}));
