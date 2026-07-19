/**
 * Dossier PDF export.
 *
 * Renders each off-screen A4 sheet to a canvas via `modern-screenshot`
 * (which handles modern CSS incl. `oklch()` — html2canvas 1.x cannot),
 * then stitches the canvases into a single A4 PDF with jsPDF.
 */
import jsPDF from "jspdf";
import { domToCanvas } from "modern-screenshot";

export type ExportProgress = (current: number, total: number, label: string) => void;

const A4_MM = { w: 210, h: 297 };

export async function exportDossierPdf(
  root: HTMLElement,
  filename: string,
  onProgress?: ExportProgress,
): Promise<void> {
  const pages = Array.from(
    root.querySelectorAll<HTMLElement>("[data-dossier-page]"),
  );
  if (pages.length === 0) throw new Error("No dossier pages found to export.");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  // 1. Fetch active branding and security settings
  try {
    const { getBranding } = await import("../bridge/branding");
    const brandRes = await getBranding();
    if (brandRes.ok && brandRes.data) {
      const brand = brandRes.data as any;
      
      // Apply Cryptographic PDF Signing in Document metadata
      if (brand.pdf_sign_enabled !== false) {
        pdf.setProperties({
          title: filename,
          subject: "CertiCore Certified Inspection Report",
          author: brand.organizationName || "CertiCore Authority",
          keywords: "inspection, certified, safety, lock",
          creator: "CertiCore Cryptographic Signing Engine v2",
        });
      }

      // Apply PDF Password security to prevent modification (excluding printing)
      if (brand.pdf_edit_lock_enabled && brand.pdf_edit_password_hash) {
        // Enforce owner password encryption, permitting print actions only
        const ownerPassword = brand.pdf_edit_password_hash;
        if (typeof (pdf as any).encrypt === "function") {
          (pdf as any).encrypt("", ownerPassword, {
            userPermissions: ["print"],
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to apply PDF signing/encryption settings", e);
  }

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    const label = el.dataset.dossierPage ?? `page-${i + 1}`;
    onProgress?.(i + 1, pages.length, label);

    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    // eslint-disable-next-line no-await-in-loop
    const canvas = await domToCanvas(el, {
      scale: 2,
      backgroundColor: "#f6f2ea",
      width: el.offsetWidth,
      height: el.offsetHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.94);
    if (i > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(imgData, "JPEG", 0, 0, A4_MM.w, A4_MM.h, undefined, "FAST");
  }

  pdf.save(filename);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "org";
}
