/**
 * Tauri boundary layer — Media Library commands.
 * Rust mapping: media_list / media_upload / media_delete / media_update.
 *
 * Prototype persists metadata + base64 to localStorage; Rust impl will
 * copy binaries into `AppData/certicore/media/` and store metadata index.
 */
import type { MediaAsset, MediaKind, Result } from "@/types";

const KEY = "certicore.media.v1";

function uid(prefix = "m"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function detectKind(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("sheet")) return "document";
  return "document";
}

const PLACEHOLDER_SVG = (label: string, hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='hsl(${hue},60%,45%)'/><stop offset='100%' stop-color='hsl(${(hue + 40) % 360},70%,25%)'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><text x='50%' y='52%' text-anchor='middle' font-family='system-ui' font-size='28' font-weight='700' fill='white' opacity='0.9'>${label}</text></svg>`,
  )}`;

export const SEED_MEDIA: MediaAsset[] = [
  {
    id: "m_hoist",
    name: "Overhead hoist — bay 4",
    kind: "image",
    mime: "image/svg+xml",
    sizeBytes: 184_320,
    tags: ["lifting", "site-photo"],
    dataUrl: PLACEHOLDER_SVG("Hoist / Bay 4", 210),
    uploadedBy: "Layla Al-Harbi",
    uploadedAt: "2026-06-14T10:30:00.000Z",
  },
  {
    id: "m_vessel",
    name: "Pressure vessel plate",
    kind: "image",
    mime: "image/svg+xml",
    sizeBytes: 220_180,
    tags: ["pressure", "nameplate"],
    dataUrl: PLACEHOLDER_SVG("Vessel Nameplate", 30),
    uploadedBy: "Omar Hadi",
    uploadedAt: "2026-06-10T08:12:00.000Z",
  },
  {
    id: "m_sig_manager",
    name: "Signature — H. Al-Rashid",
    kind: "signature",
    mime: "image/svg+xml",
    sizeBytes: 12_400,
    tags: ["signature", "manager"],
    dataUrl: PLACEHOLDER_SVG("H. Al-Rashid ✍", 78),
    uploadedBy: "System",
    uploadedAt: "2025-11-02T14:00:00.000Z",
  },
  {
    id: "m_scheme",
    name: "Written scheme of examination.pdf",
    kind: "document",
    mime: "application/pdf",
    sizeBytes: 890_240,
    tags: ["reference", "pressure"],
    dataUrl: "",
    uploadedBy: "Layla Al-Harbi",
    uploadedAt: "2026-05-28T09:45:00.000Z",
  },
  {
    id: "m_scaffold",
    name: "Scaffold — north wing",
    kind: "image",
    mime: "image/svg+xml",
    sizeBytes: 312_020,
    tags: ["scaffold", "site-photo"],
    dataUrl: PLACEHOLDER_SVG("Scaffold N-Wing", 160),
    uploadedBy: "Sara Nasser",
    uploadedAt: "2026-06-22T13:05:00.000Z",
  },
];

function load(): MediaAsset[] {
  if (typeof window === "undefined") return SEED_MEDIA;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    window.localStorage.setItem(KEY, JSON.stringify(SEED_MEDIA));
    return SEED_MEDIA;
  }
  try {
    return JSON.parse(raw) as MediaAsset[];
  } catch {
    return SEED_MEDIA;
  }
}

function persist(list: MediaAsset[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  }
}

export async function listMedia(): Promise<Result<MediaAsset[]>> {
  await new Promise((r) => setTimeout(r, 120));
  return { ok: true, data: load() };
}

export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.type.includes("svg")) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile.size < file.size ? compressedFile : file);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      resolve(file);
    };
  });
}

export async function uploadMedia(file: File, tags: string[], uploadedBy: string): Promise<Result<MediaAsset>> {
  const processedFile = await compressImage(file);

  if (processedFile.size > 8 * 1024 * 1024) {
    return { ok: false, error: { code: "too_large", message: "File must be under 8 MB." } };
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(processedFile);
  });
  const asset: MediaAsset = {
    id: uid("m"),
    name: processedFile.name,
    kind: detectKind(processedFile.type),
    mime: processedFile.type || "application/octet-stream",
    sizeBytes: processedFile.size,
    tags,
    dataUrl,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
  const list = load();
  list.unshift(asset);
  persist(list);
  return { ok: true, data: asset };
}

export async function deleteMedia(id: string): Promise<Result<true>> {
  await new Promise((r) => setTimeout(r, 100));
  persist(load().filter((m) => m.id !== id));
  return { ok: true, data: true };
}

export async function updateMedia(id: string, patch: Partial<Pick<MediaAsset, "name" | "tags">>): Promise<Result<MediaAsset>> {
  await new Promise((r) => setTimeout(r, 80));
  const list = load();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return { ok: false, error: { code: "not_found", message: "Asset not found" } };
  list[idx] = { ...list[idx], ...patch };
  persist(list);
  return { ok: true, data: list[idx] };
}
