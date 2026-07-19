import { create } from "zustand";
import type { AuditEvent } from "@/types";
import { listAudit } from "@/lib/bridge/audit";

type AuditState = {
  events: AuditEvent[];
  status: "idle" | "loading" | "ready";
  hydrate: () => Promise<void>;
};

export const useAuditStore = create<AuditState>((set) => ({
  events: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const res = await listAudit();
    set({ events: res.ok ? res.data : [], status: "ready" });
  },
}));
