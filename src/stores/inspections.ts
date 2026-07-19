import { create } from "zustand";
import type { InspectionDraft, IssuedCertificate } from "@/types";
import {
  deleteDraft,
  issueCertificate,
  type IssueInput,
  listCertificates,
  listDrafts,
  upsertDraft,
} from "@/lib/bridge/inspections";

type InspectionsState = {
  drafts: InspectionDraft[];
  certificates: IssuedCertificate[];
  status: "idle" | "loading" | "ready";
  hydrate: () => Promise<void>;
  saveDraft: (draft: InspectionDraft) => Promise<InspectionDraft>;
  removeDraft: (id: string) => Promise<void>;
  issue: (input: IssueInput) => Promise<IssuedCertificate | null>;
};

export const useInspectionsStore = create<InspectionsState>((set, get) => ({
  drafts: [],
  certificates: [],
  status: "idle",
  hydrate: async () => {
    set({ status: "loading" });
    const [d, c] = await Promise.all([listDrafts(), listCertificates()]);
    set({
      drafts: d.ok ? d.data : [],
      certificates: c.ok ? c.data : [],
      status: "ready",
    });
  },
  saveDraft: async (draft) => {
    const res = await upsertDraft(draft);
    if (!res.ok) return draft;
    const list = get().drafts;
    const exists = list.some((d) => d.id === res.data.id);
    set({
      drafts: exists
        ? list.map((d) => (d.id === res.data.id ? res.data : d))
        : [res.data, ...list],
    });
    return res.data;
  },
  removeDraft: async (id) => {
    await deleteDraft(id);
    set({ drafts: get().drafts.filter((d) => d.id !== id) });
  },
  issue: async (input) => {
    const res = await issueCertificate(input);
    if (!res.ok) return null;
    // remove associated draft
    await deleteDraft(input.draft.id);
    set({
      certificates: [res.data, ...get().certificates],
      drafts: get().drafts.filter((d) => d.id !== input.draft.id),
    });
    return res.data;
  },
}));
