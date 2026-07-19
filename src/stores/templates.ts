import { create } from "zustand";
import type { CertificateTemplate, TemplateField, TemplateSection } from "@/types";
import {
  deleteTemplate as bridgeDelete,
  duplicateTemplate as bridgeDuplicate,
  listTemplates,
  makeField,
  makeSection,
  makeEmptyTemplate,
  saveTemplate as bridgeSave,
} from "@/lib/bridge/templates";

type TemplatesState = {
  templates: CertificateTemplate[];
  status: "idle" | "loading" | "ready" | "saving";
  selectedId: string | null;
  draft: CertificateTemplate | null;
  dirty: boolean;

  hydrate: () => Promise<void>;
  select: (id: string | null) => void;
  createNew: () => void;
  patchDraft: (partial: Partial<CertificateTemplate>) => void;
  addSection: () => void;
  updateSection: (id: string, partial: Partial<TemplateSection>) => void;
  removeSection: (id: string) => void;
  moveSection: (id: string, dir: -1 | 1) => void;
  addField: (sectionId: string) => void;
  updateField: (sectionId: string, fieldId: string, partial: Partial<TemplateField>) => void;
  removeField: (sectionId: string, fieldId: string) => void;
  moveField: (sectionId: string, fieldId: string, dir: -1 | 1) => void;
  save: () => Promise<boolean>;
  discard: () => void;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
};

function move<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[idx], copy[j]] = [copy[j], copy[idx]];
  return copy;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  status: "idle",
  selectedId: null,
  draft: null,
  dirty: false,

  hydrate: async () => {
    set({ status: "loading" });
    const res = await listTemplates();
    const list = res.ok ? res.data : [];
    const currentId = get().selectedId;
    const nextId = currentId && list.find((t) => t.id === currentId) ? currentId : list[0]?.id ?? null;
    const nextDraft = list.find((t) => t.id === nextId) ?? null;
    set({
      templates: list,
      status: "ready",
      selectedId: nextId,
      draft: nextDraft ? structuredClone(nextDraft) : null,
      dirty: false,
    });
  },

  select: (id) => {
    const tpl = get().templates.find((t) => t.id === id) ?? null;
    set({ selectedId: id, draft: tpl ? structuredClone(tpl) : null, dirty: false });
  },

  createNew: () => {
    const tpl = makeEmptyTemplate();
    set((s) => ({
      templates: [...s.templates, tpl],
      selectedId: tpl.id,
      draft: structuredClone(tpl),
      dirty: true,
    }));
  },

  patchDraft: (partial) => {
    const d = get().draft;
    if (!d) return;
    set({ draft: { ...d, ...partial }, dirty: true });
  },

  addSection: () => {
    const d = get().draft;
    if (!d) return;
    set({ draft: { ...d, sections: [...d.sections, makeSection()] }, dirty: true });
  },

  updateSection: (id, partial) => {
    const d = get().draft;
    if (!d) return;
    set({
      draft: {
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      },
      dirty: true,
    });
  },

  removeSection: (id) => {
    const d = get().draft;
    if (!d) return;
    set({ draft: { ...d, sections: d.sections.filter((s) => s.id !== id) }, dirty: true });
  },

  moveSection: (id, dir) => {
    const d = get().draft;
    if (!d) return;
    const idx = d.sections.findIndex((s) => s.id === id);
    set({ draft: { ...d, sections: move(d.sections, idx, dir) }, dirty: true });
  },

  addField: (sectionId) => {
    const d = get().draft;
    if (!d) return;
    set({
      draft: {
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId ? { ...s, fields: [...s.fields, makeField()] } : s,
        ),
      },
      dirty: true,
    });
  },

  updateField: (sectionId, fieldId, partial) => {
    const d = get().draft;
    if (!d) return;
    set({
      draft: {
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...partial } : f)),
              }
            : s,
        ),
      },
      dirty: true,
    });
  },

  removeField: (sectionId, fieldId) => {
    const d = get().draft;
    if (!d) return;
    set({
      draft: {
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s,
        ),
      },
      dirty: true,
    });
  },

  moveField: (sectionId, fieldId, dir) => {
    const d = get().draft;
    if (!d) return;
    set({
      draft: {
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const idx = s.fields.findIndex((f) => f.id === fieldId);
          return { ...s, fields: move(s.fields, idx, dir) };
        }),
      },
      dirty: true,
    });
  },

  save: async () => {
    const d = get().draft;
    if (!d) return false;
    set({ status: "saving" });
    const res = await bridgeSave(d);
    if (!res.ok) {
      set({ status: "ready" });
      return false;
    }
    const saved = res.data;
    set((s) => ({
      templates: s.templates.some((t) => t.id === saved.id)
        ? s.templates.map((t) => (t.id === saved.id ? saved : t))
        : [...s.templates, saved],
      draft: structuredClone(saved),
      dirty: false,
      status: "ready",
    }));
    return true;
  },

  discard: () => {
    const { selectedId, templates } = get();
    const tpl = templates.find((t) => t.id === selectedId) ?? null;
    set({ draft: tpl ? structuredClone(tpl) : null, dirty: false });
  },

  remove: async (id) => {
    await bridgeDelete(id);
    set((s) => {
      const list = s.templates.filter((t) => t.id !== id);
      const nextId = s.selectedId === id ? list[0]?.id ?? null : s.selectedId;
      const nextDraft = list.find((t) => t.id === nextId) ?? null;
      return {
        templates: list,
        selectedId: nextId,
        draft: nextDraft ? structuredClone(nextDraft) : null,
        dirty: false,
      };
    });
  },

  duplicate: async (id) => {
    const res = await bridgeDuplicate(id);
    if (!res.ok) return;
    set((s) => ({
      templates: [...s.templates, res.data],
      selectedId: res.data.id,
      draft: structuredClone(res.data),
      dirty: false,
    }));
  },
}));
