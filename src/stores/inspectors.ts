import { create } from "zustand";
import type { Inspector } from "@/types";
import {
  deleteInspector,
  type InspectorDraft,
  listInspectors,
  SEAT_LIMIT,
  toggleSeat,
  upsertInspector,
} from "@/lib/bridge/inspectors";

type InspectorsState = {
  inspectors: Inspector[];
  status: "idle" | "loading" | "ready" | "saving";
  seatLimit: number;
  hydrate: () => Promise<void>;
  upsert: (draft: InspectorDraft) => Promise<{ ok: boolean; message?: string }>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<{ ok: boolean; message?: string }>;
};

export const useInspectorsStore = create<InspectorsState>((set, get) => ({
  inspectors: [],
  status: "idle",
  seatLimit: SEAT_LIMIT,
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listInspectors();
    set({ inspectors: res.ok ? res.data : [], status: "ready" });
  },
  upsert: async (draft) => {
    set({ status: "saving" });
    const res = await upsertInspector(draft);
    if (!res.ok) {
      set({ status: "ready" });
      return { ok: false, message: res.error.message };
    }
    const list = get().inspectors;
    const exists = list.some((i) => i.id === res.data.id);
    set({
      inspectors: exists ? list.map((i) => (i.id === res.data.id ? res.data : i)) : [...list, res.data],
      status: "ready",
    });
    return { ok: true };
  },
  remove: async (id) => {
    await deleteInspector(id);
    set({ inspectors: get().inspectors.filter((i) => i.id !== id) });
  },
  toggle: async (id) => {
    const res = await toggleSeat(id);
    if (!res.ok) return { ok: false, message: res.error.message };
    set({ inspectors: get().inspectors.map((i) => (i.id === id ? res.data : i)) });
    return { ok: true };
  },
}));
