import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { toast } from "sonner";
import { Copy, Download, KeyRound, QrCode, ShieldCheck, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getConfig, saveConfig, getOrCreateKeypair, rotateKeypair,
  signAndPackage, listPublished, verifyUrlFor, storageUrlFor,
  type PublishConfig, type StoredKeypair, type PublishedCertificate,
} from "@/lib/bridge/publish-cert";
import { useInspectionsStore } from "@/stores/inspections";
import { useLicenseStore } from "@/stores/license";
import { useT } from "@/hooks/use-t";

export const Route = createFileRoute("/app/publish")({
  head: () => ({
    meta: [
      { title: "Public Verification — CertiCore" },
      { name: "description", content: "Sign & publish certificates for zero-backend QR verification." },
    ],
  }),
  component: PublishPage,
});

function PublishPage() {
  const t = useT();
  const certs = useInspectionsStore((s) => s.certificates);
  const status = useInspectionsStore((s) => s.status);
  const hydrate = useInspectionsStore((s) => s.hydrate);
  
  const license = useLicenseStore((s) => s.license);
  const licStatus = useLicenseStore((s) => s.status);
  const hydrateLic = useLicenseStore((s) => s.hydrate);

  const [cfg, setCfg] = useState<PublishConfig>({ storageBaseUrl: "", verifyBaseUrl: "" });
  const [kp, setKp] = useState<StoredKeypair | null>(null);
  const [published, setPublished] = useState<PublishedCertificate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (status === "idle") void hydrate(); }, [status, hydrate]);
  useEffect(() => { if (licStatus === "idle") void hydrateLic(); }, [licStatus, hydrateLic]);
  useEffect(() => {
    void (async () => {
      const [c, k, p] = await Promise.all([getConfig(), getOrCreateKeypair(), listPublished()]);
      if (c.ok) setCfg(c.data);
      if (k.ok) setKp(k.data);
      if (p.ok) setPublished(p.data);
    })();
  }, []);

  const publishedIds = useMemo(() => new Set(published.map((p) => p.certificateId)), [published]);

  async function saveCfg() {
    await saveConfig(cfg);
    toast.success(t("publish.toast.saved"));
  }

  async function onRotate() {
    if (!confirm(t("publish.rotateConfirm"))) return;
    const r = await rotateKeypair();
    if (r.ok) { setKp(r.data); toast.success(t("publish.toast.rotated")); }
  }

  async function onPublish(certId: string) {
    const cert = certs.find((c) => c.id === certId);
    if (!cert) return;
    setBusy(certId);
    const r = await signAndPackage(cert);
    setBusy(null);
    if (!r.ok) { toast.error(r.error.message); return; }
    setPublished((prev) => {
      const idx = prev.findIndex((p) => p.certificateId === certId);
      return idx >= 0 ? prev.map((p, i) => i === idx ? r.data : p) : [r.data, ...prev];
    });
    toast.success(t("publish.toast.signed"));
  }

  function downloadJson(pkg: PublishedCertificate) {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${pkg.certificateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy(text: string, msg: string) {
    void navigator.clipboard.writeText(text);
    toast.success(msg);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border" style={{ borderColor: "color-mix(in oklch, var(--brand-accent) 30%, transparent)", background: "color-mix(in oklch, var(--brand-accent) 10%, transparent)" }}>
            <QrCode className="h-5 w-5" style={{ color: "var(--brand-accent)" }} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--brand-accent)" }}>{t("publish.title")}</h1>
            <p className="mt-0.5 text-sm text-white/60">{t("publish.subtitle")}</p>
          </div>
        </div>
      </m.div>

      {/* Keypair */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-white/60" />
          <h2 className="font-semibold text-white/90">{t("publish.keypair")}</h2>
        </div>
        {kp ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-white/50">{t("publish.publicKey")}</Label>
              <div className="mt-1 flex gap-2">
                <Input readOnly value={kp.publicKeyB64} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(kp.publicKeyB64, t("publish.toast.copied"))} className="border-white/15 bg-white/[0.02]">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-white/50">{t("publish.publicKey.hint")}</p>
            </div>
            <Button variant="outline" onClick={onRotate} className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10">
              {t("publish.rotate")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-white/50"><Loader2 className="inline h-3 w-3 animate-spin" /> {t("common.loading")}…</p>
        )}
      </div>

      {/* Config */}
      {license?.tier === "enterprise" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white/60" />
            <h2 className="font-semibold text-white/90">{t("publish.hosting")}</h2>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-white/50">{t("publish.storageUrl")}</Label>
            <Input value={cfg.storageBaseUrl} onChange={(e) => setCfg({ ...cfg, storageBaseUrl: e.target.value })} placeholder="https://cdn.example.com/certs" className="mt-1" />
            <p className="mt-1 text-[11px] text-white/50">{t("publish.storageUrl.hint")}</p>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-white/50">{t("publish.verifyUrl")}</Label>
            <Input value={cfg.verifyBaseUrl} onChange={(e) => setCfg({ ...cfg, verifyBaseUrl: e.target.value })} placeholder="https://verify.example.com" className="mt-1" />
            <p className="mt-1 text-[11px] text-white/50">{t("publish.verifyUrl.hint")}</p>
          </div>
          <Button onClick={saveCfg} style={{ backgroundColor: "var(--brand-accent)", color: "oklch(0.13 0.04 260)" }}>
            {t("common.save")}
          </Button>
        </div>
      )}

      {/* Certificates */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4 text-white/60" />
          <h2 className="font-semibold text-white/90">{t("publish.certificates")}</h2>
        </div>
        {certs.length === 0 ? (
          <p className="text-sm text-white/50">{t("publish.empty")}</p>
        ) : (
          <div className="space-y-2">
            {certs.map((c) => {
              const pub = publishedIds.has(c.id);
              const pkg = published.find((p) => p.certificateId === c.id);
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white/90">{c.equipmentTag} · {c.equipmentName}</div>
                    <div className="text-[11px] text-white/50">{c.id} · {c.templateName} · {new Date(c.issuedAt).toLocaleDateString()}</div>
                  </div>
                  {pub && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {t("publish.signed")}
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={() => onPublish(c.id)}
                    disabled={busy === c.id}
                    style={{ backgroundColor: "var(--brand-accent)", color: "oklch(0.13 0.04 260)" }}
                  >
                    {busy === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : pub ? t("publish.resign") : t("publish.signBtn")}
                  </Button>
                  {pkg && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => downloadJson(pkg)} className="border-white/15 bg-white/[0.02]">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copy(verifyUrlFor(cfg, c.id), t("publish.toast.copiedUrl"))} className="border-white/15 bg-white/[0.02] text-[11px]">
                        {t("publish.copyVerifyUrl")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copy(storageUrlFor(cfg, c.id), t("publish.toast.copiedUrl"))} className="border-white/15 bg-white/[0.02] text-[11px]">
                        {t("publish.copyStorageUrl")}
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-xs text-white/60">
        <p className="mb-1 font-semibold text-white/80">{t("publish.howto.title")}</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li>{t("publish.howto.1")}</li>
          <li>{t("publish.howto.2")}</li>
          <li>{t("publish.howto.3")}</li>
          <li>{t("publish.howto.4")}</li>
        </ol>
      </div>
    </div>
  );
}
