export type Role = "manager" | "inspector";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarInitials: string;
  forcePasswordChange?: boolean;
};

export type BridgeError = { code: string; message: string };
export type Result<T> = { ok: true; data: T } | { ok: false; error: BridgeError };

export type NavItem = {
  to: string;
  labelKey: string;
  icon: string;
};

export type Branding = {
  organizationName: string;
  organizationNameAr?: string;
  registrationNo: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  primaryColor: string;
  accentColor: string;
  footerText: string;
  footerTextAr?: string;
  logoDataUrl: string | null;
  /* Signature & stamp — appear on every issued dossier */
  managerName: string;
  managerTitle: string;
  managerSignatureDataUrl: string | null;
  stampDataUrl: string | null;
  accreditations?: string; // free-form line: "UKAS · SASO · ISO 17020"
  accreditationLogos?: AccreditationLogo[];
  watermarkEnabled?: boolean;
  updatedAt: string;
};

export type AccreditationLogo = {
  id: string;
  name: string;      // "UKAS" / "SASO" / "ISO 17020"
  dataUrl: string;   // base64 data URL
};

/* ------------------------------------------------------------------ */
/* Equipment taxonomy — flat string enum, Rust/serde-friendly.        */
/* ------------------------------------------------------------------ */

export type EquipmentCategory =
  | "lifting_gear"        // slings, shackles, hooks, chains
  | "overhead_crane"      // gantry, EOT, jib
  | "tower_crane"
  | "mobile_crane_mewp"   // mobile crane, MEWP, telehandler
  | "pressure_vessel"     // vessels, boilers
  | "pipeline"            // process pipe, oil & gas lines
  | "generic";            // fallback / custom

export const EQUIPMENT_CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  lifting_gear: "Lifting gear",
  overhead_crane: "Overhead & gantry crane",
  tower_crane: "Tower crane",
  mobile_crane_mewp: "Mobile crane / MEWP",
  pressure_vessel: "Pressure vessel",
  pipeline: "Pipeline / process pipe",
  generic: "General equipment",
};

/* ------------------------------------------------------------------ */
/* Standards library                                                  */
/* ------------------------------------------------------------------ */

export type Standard = {
  id: string;
  code: string;              // e.g. "LOLER-1998-r9"
  title: string;
  jurisdiction: string;      // "UK" | "EU" | "ISO" | "API" | "ASME" | "SA" | custom
  category: EquipmentCategory | "general";
  revision: string;          // "1998" | "2020" | "Ed. 5"
  summary: string;
};

/* ------------------------------------------------------------------ */
/* NDT & test equipment                                               */
/* ------------------------------------------------------------------ */

export type NdtMethod =
  | "VT"              // visual
  | "MPI"             // magnetic particle
  | "DPI"             // dye penetrant
  | "UT"              // ultrasonic
  | "PT"              // penetrant test
  | "RT"              // radiographic
  | "LOAD_TEST"       // proof / dynamic load
  | "HYDRO"           // hydrostatic
  | "INSULATION"      // electrical insulation resistance
  | "TORQUE"          // fastener torque
  | "PULL_TEST"       // anchor / bolt pull
  | "BRAKE_TEST"      // brake slip / holding
  | "THICKNESS_UT";   // wall-thickness UT

export const NDT_METHOD_LABEL: Record<NdtMethod, string> = {
  VT: "Visual (VT)",
  MPI: "Magnetic particle (MPI)",
  DPI: "Dye penetrant (DPI)",
  UT: "Ultrasonic (UT)",
  PT: "Penetrant (PT)",
  RT: "Radiographic (RT)",
  LOAD_TEST: "Load / proof test",
  HYDRO: "Hydrostatic test",
  INSULATION: "Insulation resistance",
  TORQUE: "Torque verification",
  PULL_TEST: "Pull / anchor test",
  BRAKE_TEST: "Brake test",
  THICKNESS_UT: "Wall-thickness UT",
};

export type TestEquipment = {
  id: string;
  tag: string;                 // internal asset tag
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  methods: NdtMethod[];        // methods this tool is used for
  calibrationDueAt: string;    // ISO
  calibrationCertRef: string;  // "UKAS-CAL-88221"
  ownerLab: string;            // "In-house metrology"
  notes?: string;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Templates                                                          */
/* ------------------------------------------------------------------ */

export type TemplateFieldKind =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "textarea"
  | "signature";

export type TemplateField = {
  id: string;
  label: string;
  kind: TemplateFieldKind;
  required: boolean;
  placeholder?: string;
  options?: string[];
  unit?: string;
};

export type TemplateSection = {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
};

export type TemplateStatus = "draft" | "published" | "archived";

export type CertificateTemplate = {
  id: string;
  name: string;
  category: string;                          // legacy freeform label
  version: number;
  status: TemplateStatus;
  description: string;
  sections: TemplateSection[];
  updatedAt: string;
  createdAt: string;
  /* New — inspection dossier metadata */
  equipmentCategory?: EquipmentCategory;
  standardIds?: string[];
  checklistBankId?: string | null;
  mandatoryNdtMethods?: NdtMethod[];
};

/* ------------------------------------------------------------------ */
/* Media                                                              */
/* ------------------------------------------------------------------ */

export type MediaKind = "image" | "document" | "signature";

export type MediaAsset = {
  id: string;
  name: string;
  kind: MediaKind;
  mime: string;
  sizeBytes: number;
  tags: string[];
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
};

/* ------------------------------------------------------------------ */
/* Users & audit                                                      */
/* ------------------------------------------------------------------ */

export type InspectorStatus = "active" | "invited" | "suspended";

export type Inspector = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  region: string;
  specialty: string;
  status: InspectorStatus;
  seatAllocated: boolean;
  certificatesIssued: number;
  lastActiveAt: string;
  createdAt: string;
  avatarInitials: string;
  title?: string;                    // "PCN Level II" / "LEEA-Cert Examiner"
  signatureDataUrl?: string | null;  // for dossier signature blocks
  qualification?: string;            // "PCN NDT-8827" (Repurposed for username prefix)
  expiresAt?: string;                // ISO date when inspector certification expires
};

export type AuditSeverity = "info" | "success" | "warning" | "critical";

export type AuditEvent = {
  id: string;
  actor: string;
  actorRole: Role;
  action: string;
  target: string;
  severity: AuditSeverity;
  category: "auth" | "branding" | "template" | "media" | "user" | "certificate" | "system";
  detail?: string;
  ip?: string;
  at: string;
};

/* ------------------------------------------------------------------ */
/* Equipment                                                          */
/* ------------------------------------------------------------------ */

export type EquipmentStatus = "active" | "quarantined" | "retired";

export type Equipment = {
  id: string;
  tag: string;
  name: string;
  category: string;                       // legacy freeform label
  manufacturer: string;
  serialNumber: string;
  site: string;
  workingLoad?: string;
  status: EquipmentStatus;
  lastInspectedAt: string | null;
  nextInspectionDue: string;
  notes?: string;
  createdAt: string;
  /* New — structured taxonomy + specification sheet */
  equipmentCategory?: EquipmentCategory;
  spec?: EquipmentSpec;
};

/**
 * Nameplate + spec-sheet data.
 * Kept flat & string-heavy so it maps 1:1 to a Rust struct / SQLite row.
 */
export type EquipmentSpec = {
  ratedCapacity?: string;      // "5,000 kg" / "16 bar"
  dutyClass?: string;          // FEM 2m, ISO M5, Class B31.3
  yearOfManufacture?: string;
  countryOfOrigin?: string;
  designStandard?: string;     // "ISO 4308"
  material?: string;           // "Alloy steel, grade 8"
  dimensions?: string;         // "Span 22 m, hoist 12 m"
  weightKg?: string;
  powerRating?: string;        // "37 kW, 3ph 415V"
  operatingRange?: string;     // "-20 °C to +50 °C"
  driveSystem?: string;
  additional?: string;         // free-text
};

/* ------------------------------------------------------------------ */
/* Inspection — dynamic answers                                       */
/* ------------------------------------------------------------------ */

export type InspectionFieldValue = string | number | boolean | null;

export type InspectionAnswer = {
  fieldId: string;
  value: InspectionFieldValue;
};

/* ------------------------------------------------------------------ */
/* Checklist                                                          */
/* ------------------------------------------------------------------ */

export type Verdict = "pass" | "fail" | "na";

export type ChecklistItem = {
  id: string;
  clause: string;             // "ISO 4309 §4.2.1"
  standardId: string | null;  // reference into StandardsStore
  question: string;
  verdict: Verdict;
  note: string;
  photoIds: string[];
};

/* ------------------------------------------------------------------ */
/* NDT records                                                        */
/* ------------------------------------------------------------------ */

export type NdtRecord = {
  id: string;
  method: NdtMethod;
  area: string;                    // "Hook shank, saddle radius"
  technician: string;
  technicianCertRef: string;       // "PCN Level II — NDT-8827"
  testEquipmentId: string | null;  // references TestEquipment.id
  acceptanceCriteria: string;      // "No linear indications > 2 mm; per ISO 3059"
  measuredResult: string;          // "No relevant indications"
  verdict: Verdict;
  performedAt: string;             // ISO
  notes: string;
  photoIds: string[];
  reportRef: string;               // "NDT-RPT-2026-091"
};

/* ------------------------------------------------------------------ */
/* Defects                                                            */
/* ------------------------------------------------------------------ */

export type DefectSeverity = "minor" | "major" | "critical";
export type DefectStatus = "open" | "closed";

export type Defect = {
  id: string;
  description: string;
  location: string;
  severity: DefectSeverity;
  remedialAction: string;
  deadline: string;                // ISO — deadline to remedy
  photoIds: string[];
  status: DefectStatus;
};

/* ------------------------------------------------------------------ */
/* Draft & issued certificate                                         */
/* ------------------------------------------------------------------ */

export type InspectionDraft = {
  id: string;
  equipmentId: string;
  templateId: string;
  inspectorId: string;
  inspectorName: string;
  answers: Record<string, InspectionFieldValue>;
  photos: string[];
  step: number;
  createdAt: string;
  updatedAt: string;
  /* New — dossier sections */
  checklist?: ChecklistItem[];
  ndt?: NdtRecord[];
  defects?: Defect[];
  testEquipmentIds?: string[];
};

export type CertificateResult = "pass" | "conditional" | "fail";

export type IssuedCertificate = {
  id: string;
  equipmentId: string;
  equipmentTag: string;
  equipmentName: string;
  templateId: string;
  templateName: string;
  inspectorId: string;
  inspectorName: string;
  result: CertificateResult;
  answers: Record<string, InspectionFieldValue>;
  photos: string[];
  issuedAt: string;
  validUntil: string;
  hash: string;
  /* New — persisted dossier snapshot */
  equipmentCategory?: EquipmentCategory;
  standardIds?: string[];
  spec?: EquipmentSpec;
  checklist?: ChecklistItem[];
  ndt?: NdtRecord[];
  defects?: Defect[];
  testEquipmentIds?: string[];
};
