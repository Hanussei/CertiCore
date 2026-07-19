/**
 * Tauri boundary layer — Template commands.
 * Rust mapping: templates_list / templates_get / templates_save /
 * templates_delete / templates_duplicate.
 *
 * Prototype persists to localStorage; Rust impl will write to
 * `AppData/certicore/templates/*.json`.
 */
import type { CertificateTemplate, Result } from "@/types";

const KEY = "certicore.templates.v2";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SEED_TEMPLATES: CertificateTemplate[] = [
  {
    id: "tpl_lifting_gear",
    name: "Lifting Gear Inspection",
    category: "Lifting Equipment",
    equipmentCategory: "lifting_gear",
    checklistBankId: "bank_lifting_gear",
    standardIds: ["std_loler_r9", "std_leea_copsule"],
    mandatoryNdtMethods: ["VT", "MPI"],
    version: 3,
    status: "published",
    description: "Thorough examination of slings, shackles, and hooks per LOLER & LEEA.",
    createdAt: "2025-04-12T09:00:00.000Z",
    updatedAt: "2026-05-02T11:20:00.000Z",
    sections: [
      {
        id: "sec_identity",
        title: "Equipment identity",
        description: "Uniquely identify the item under inspection.",
        fields: [
          { id: uid("f"), label: "Serial number", kind: "text", required: true, placeholder: "SN-…" },
          { id: uid("f"), label: "Manufacturer", kind: "text", required: true },
          { id: uid("f"), label: "Working load limit", kind: "number", required: true, unit: "kg" },
          {
            id: uid("f"),
            label: "Category",
            kind: "select",
            required: true,
            options: ["Chain sling", "Wire rope sling", "Shackle", "Hook block", "Eye bolt"],
          },
        ],
      },
      {
        id: "sec_visual",
        title: "Visual examination",
        fields: [
          { id: uid("f"), label: "Deformation observed", kind: "checkbox", required: false },
          { id: uid("f"), label: "Corrosion observed", kind: "checkbox", required: false },
          { id: uid("f"), label: "Notes", kind: "textarea", required: false, placeholder: "Observations…" },
        ],
      },
    ],
  },
  {
    id: "tpl_overhead_crane",
    name: "Overhead / Gantry Crane — Thorough Examination",
    category: "Cranes",
    equipmentCategory: "overhead_crane",
    checklistBankId: "bank_overhead_crane",
    standardIds: ["std_bs_7121", "std_iso_4309"],
    mandatoryNdtMethods: ["VT", "LOAD_TEST", "BRAKE_TEST"],
    version: 2,
    status: "published",
    description: "BS 7121-2 / ISO 4309 examination for EOT and gantry cranes.",
    createdAt: "2025-11-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
    sections: [
      {
        id: "sec_identity",
        title: "Crane identity",
        fields: [
          { id: uid("f"), label: "Crane number", kind: "text", required: true },
          { id: uid("f"), label: "SWL", kind: "number", required: true, unit: "kg" },
          { id: uid("f"), label: "Span", kind: "number", required: false, unit: "m" },
        ],
      },
      {
        id: "sec_conditions",
        title: "Site conditions",
        fields: [
          { id: uid("f"), label: "Ambient temperature", kind: "number", required: false, unit: "°C" },
          { id: uid("f"), label: "Wind speed", kind: "number", required: false, unit: "km/h" },
        ],
      },
    ],
  },
  {
    id: "tpl_tower_crane",
    name: "Tower Crane — Thorough Examination",
    category: "Cranes",
    equipmentCategory: "tower_crane",
    checklistBankId: "bank_tower_crane",
    standardIds: ["std_bs_7121_5", "std_iso_4309"],
    mandatoryNdtMethods: ["VT", "MPI", "TORQUE", "PULL_TEST"],
    version: 1,
    status: "published",
    description: "BS 7121-5 examination — foundations, mast, slew, jib, ropes and safety systems.",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-06-15T09:00:00.000Z",
    sections: [
      {
        id: "sec_identity",
        title: "Crane configuration",
        fields: [
          { id: uid("f"), label: "Serial no.", kind: "text", required: true },
          { id: uid("f"), label: "Hook height", kind: "number", required: true, unit: "m" },
          { id: uid("f"), label: "Jib length", kind: "number", required: true, unit: "m" },
          { id: uid("f"), label: "Max wind rating", kind: "number", required: false, unit: "km/h" },
        ],
      },
    ],
  },
  {
    id: "tpl_mobile_crane",
    name: "Mobile Crane / MEWP — Thorough Examination",
    category: "Cranes",
    equipmentCategory: "mobile_crane_mewp",
    checklistBankId: "bank_mobile_crane_mewp",
    standardIds: ["std_iso_9927", "std_en_280", "std_asme_b30_5"],
    mandatoryNdtMethods: ["VT", "MPI", "LOAD_TEST"],
    version: 1,
    status: "published",
    description: "ISO 9927 / EN 280 / ASME B30.5 examination for mobile cranes and MEWPs.",
    createdAt: "2026-02-10T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
    sections: [
      {
        id: "sec_identity",
        title: "Machine configuration",
        fields: [
          { id: uid("f"), label: "Chassis no.", kind: "text", required: true },
          { id: uid("f"), label: "Boom length rigged", kind: "number", required: true, unit: "m" },
          { id: uid("f"), label: "Counterweight", kind: "number", required: false, unit: "kg" },
        ],
      },
    ],
  },
  {
    id: "tpl_pressure_vessel",
    name: "Pressure Vessel — Written Scheme of Examination",
    category: "Pressure Systems",
    equipmentCategory: "pressure_vessel",
    checklistBankId: "bank_pressure_vessel",
    standardIds: ["std_psr_2000"],
    mandatoryNdtMethods: ["VT", "THICKNESS_UT", "HYDRO"],
    version: 2,
    status: "published",
    description: "PSSR-2000 written scheme for fixed pressure vessels.",
    createdAt: "2025-08-01T09:00:00.000Z",
    updatedAt: "2026-03-14T14:00:00.000Z",
    sections: [
      {
        id: "sec_asset",
        title: "Asset details",
        fields: [
          { id: uid("f"), label: "Vessel tag", kind: "text", required: true },
          { id: uid("f"), label: "Design pressure", kind: "number", required: true, unit: "bar" },
          { id: uid("f"), label: "Medium", kind: "text", required: false },
        ],
      },
    ],
  },
  {
    id: "tpl_pipeline",
    name: "Process Piping — API 570 In-Service Inspection",
    category: "Pipelines",
    equipmentCategory: "pipeline",
    checklistBankId: "bank_pipeline",
    standardIds: ["std_api_570", "std_asme_b31_3"],
    mandatoryNdtMethods: ["VT", "THICKNESS_UT", "TORQUE"],
    version: 1,
    status: "published",
    description: "API 570 in-service inspection covering CML thickness, corrosion loops and hydro.",
    createdAt: "2026-03-20T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    sections: [
      {
        id: "sec_loop",
        title: "Corrosion loop",
        fields: [
          { id: uid("f"), label: "Loop number", kind: "text", required: true },
          { id: uid("f"), label: "Line spec", kind: "text", required: true, placeholder: "8″ Sch 40 A106-B" },
          { id: uid("f"), label: "Design pressure", kind: "number", required: true, unit: "bar" },
          { id: uid("f"), label: "Design temperature", kind: "number", required: true, unit: "°C" },
        ],
      },
    ],
  },
  {
    id: "tpl_scaffold",
    name: "Scaffold Handover",
    category: "Access & Height",
    equipmentCategory: "generic",
    checklistBankId: "bank_generic",
    standardIds: [],
    mandatoryNdtMethods: [],
    version: 2,
    status: "draft",
    description: "Handover certificate for erected scaffold structures.",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    sections: [
      {
        id: "sec_scope",
        title: "Scope",
        fields: [
          { id: uid("f"), label: "Location", kind: "text", required: true },
          { id: uid("f"), label: "Load class", kind: "select", required: true, options: ["1", "2", "3", "4", "5", "6"] },
          { id: uid("f"), label: "Handover date", kind: "date", required: true },
        ],
      },
    ],
  },
];

function load(): CertificateTemplate[] {
  if (typeof window === "undefined") return SEED_TEMPLATES;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_TEMPLATES));
    return SEED_TEMPLATES;
  }
  try {
    return JSON.parse(raw) as CertificateTemplate[];
  } catch {
    return SEED_TEMPLATES;
  }
}

function persist(list: CertificateTemplate[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  }
}

export async function listTemplates(): Promise<Result<CertificateTemplate[]>> {
  await new Promise((r) => setTimeout(r, 120));
  return { ok: true, data: load() };
}

export async function saveTemplate(tpl: CertificateTemplate): Promise<Result<CertificateTemplate>> {
  await new Promise((r) => setTimeout(r, 180));
  const list = load();
  const next: CertificateTemplate = { ...tpl, updatedAt: new Date().toISOString() };
  const idx = list.findIndex((t) => t.id === tpl.id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  persist(list);
  return { ok: true, data: next };
}

export async function deleteTemplate(id: string): Promise<Result<true>> {
  await new Promise((r) => setTimeout(r, 120));
  persist(load().filter((t) => t.id !== id));
  return { ok: true, data: true };
}

export async function duplicateTemplate(id: string): Promise<Result<CertificateTemplate>> {
  await new Promise((r) => setTimeout(r, 120));
  const list = load();
  const src = list.find((t) => t.id === id);
  if (!src) return { ok: false, error: { code: "not_found", message: "Template not found" } };
  const copy: CertificateTemplate = {
    ...src,
    id: uid("tpl"),
    name: `${src.name} (copy)`,
    version: 1,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: src.sections.map((s) => ({
      ...s,
      id: uid("sec"),
      fields: s.fields.map((f) => ({ ...f, id: uid("f") })),
    })),
  };
  list.push(copy);
  persist(list);
  return { ok: true, data: copy };
}

export function makeEmptyTemplate(): CertificateTemplate {
  const now = new Date().toISOString();
  return {
    id: uid("tpl"),
    name: "Untitled template",
    category: "General",
    equipmentCategory: "generic",
    checklistBankId: "bank_generic",
    standardIds: [],
    mandatoryNdtMethods: [],
    version: 1,
    status: "draft",
    description: "",
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: uid("sec"),
        title: "New section",
        fields: [{ id: uid("f"), label: "New field", kind: "text", required: false }],
      },
    ],
  };
}

export function makeField(): import("@/types").TemplateField {
  return { id: uid("f"), label: "New field", kind: "text", required: false };
}

export function makeSection(): import("@/types").TemplateSection {
  return { id: uid("sec"), title: "New section", fields: [makeField()] };
}
