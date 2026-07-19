import { create } from "zustand";
import {
  assess as bridgeAssess,
  listAssessments,
  type RbiAssessment,
  type RbiInputs,
} from "@/lib/bridge/rbi";

type RbiState = {
  assessments: RbiAssessment[];
  status: "idle" | "loading" | "ready";
  hydrate: () => Promise<void>;
  assess: (inputs: RbiInputs, notes?: string) => Promise<RbiAssessment | null>;
};

export const useRbiStore = create<RbiState>((set, get) => ({
  assessments: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const r = await listAssessments();
    set({ assessments: r.ok ? r.data : [], status: "ready" });
  },
  assess: async (inputs, notes) => {
    const r = await bridgeAssess(inputs, notes);
    if (!r.ok) return null;
    set({ assessments: [r.data, ...get().assessments] });
    return r.data;
  },
}));
