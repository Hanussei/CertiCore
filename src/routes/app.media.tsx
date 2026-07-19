import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Images,
  Loader2,
  PenLine,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaStore } from "@/stores/media";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-t";

import type { MediaAsset, MediaKind } from "@/types";

export const Route = createFileRoute("/app/media")({
  head: () => ({
    meta: [
      { title: "Media Library — CertiCore" },
      { name: "description", content: "Manage photos, signatures, and reference documents." },
    ],
  }),
  component: MediaPage,
});

const KIND_FILTERS: Array<{ key: MediaKind | "all"; label: string }> = [
  { key: "all", label: "All assets" },
  { key: "image", label: "Photos" },
  { key: "signature", label: "Signatures" },
  { key: "document", label: "Documents" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MediaPage() {
  const t = useT();

  const assets = useMediaStore((s) => s.assets);
  const status = useMediaStore((s) => s.status);
  const hydrate = useMediaStore((s) => s.hydrate);
  const upload = useMediaStore((s) => s.upload);
  const remove = useMediaStore((s) => s.remove);
  const rename = useMediaStore((s) => s.rename);
  const retag = useMediaStore((s) => s.retag);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [q, setQ] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false;
      if (!term) return true;
      return (
        a.name.toLowerCase().includes(term) ||
        a.tags.some((t) => t.toLowerCase().includes(term)) ||
        a.uploadedBy.toLowerCase().includes(term)
      );
    });
  }, [assets, kind, q]);

  const selectedAsset = assets.find((a) => a.id === selected) ?? null;

  const stats = useMemo(() => {
    const total = assets.length;
    const bytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0);
    const images = assets.filter((a) => a.kind === "image").length;
    const sigs = assets.filter((a) => a.kind === "signature").length;
    return { total, bytes, images, sigs };
  }, [assets]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const uploadedBy = user?.name ?? "Unknown";
    for (const file of Array.from(files)) {
      const asset = await upload(file, [], uploadedBy);
      if (asset) toast.success(`Uploaded ${asset.name}`);
      else toast.error(`Could not upload ${file.name}`);
    }
  }

  function addTag(asset: MediaAsset, raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t || asset.tags.includes(t)) return;
    void retag(asset.id, [...asset.tags, t]);
    setTagInput("");
  }

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("media.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("media.subtitle")}
          </p>

        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} className="gap-2 bg-gold text-black hover:bg-gold/90">
            <Upload className="h-4 w-4" />
            {t("media.upload")}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("media.stat.total")} value={stats.total} icon={<Images className="h-4 w-4" />} />
        <StatCard label={t("media.stat.photos")} value={stats.images} icon={<Images className="h-4 w-4" />} />
        <StatCard label={t("media.stat.signatures")} value={stats.sigs} icon={<PenLine className="h-4 w-4" />} />
        <StatCard label={t("media.stat.storage")} value={formatBytes(stats.bytes)} icon={<FileText className="h-4 w-4" />} />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative rounded-2xl border border-dashed p-6 transition-all",
          dragOver
            ? "border-gold bg-gold/10"
            : "border-border/60 bg-card/40 backdrop-blur",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("media.searchPlaceholder")}
              className="max-w-md border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-full border border-border/60 bg-background/50 p-1">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setKind(f.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  kind === f.key
                    ? "bg-gold text-black"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.key === "all" ? t("common.all") : f.key === "image" ? t("media.stat.photos") : f.key === "signature" ? t("media.stat.signatures") : f.key === "document" ? t("media.documents") : f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("media.dropzone.hint")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-h-[400px]">
          {status === "loading" ? (
            <div className="grid h-64 place-items-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-border/60 bg-card/30 text-center text-sm text-muted-foreground">
              {t("media.empty")}
            </div>
          ) : (
            <m.div
              layout
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((a) => (
                  <m.button
                    layout
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a.id)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border text-left transition-colors",
                      selected === a.id
                        ? "border-gold ring-2 ring-gold/40"
                        : "border-border/60 hover:border-gold/50",
                    )}
                  >
                    <div className="aspect-[4/3] bg-muted/40">
                      {a.kind === "document" || !a.dataUrl ? (
                        <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 to-accent/10 text-primary">
                          <FileText className="h-10 w-10 opacity-70" />
                        </div>
                      ) : (
                        <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="space-y-1 border-t border-border/50 bg-card/70 p-3 backdrop-blur">
                      <p className="line-clamp-1 text-sm font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(a.sizeBytes)} · {formatDate(a.uploadedAt)}
                      </p>
                    </div>
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">
                      {a.kind === "image" ? t("media.stat.photos") : a.kind === "signature" ? t("media.stat.signatures") : a.kind === "document" ? t("media.documents") : a.kind}
                    </span>
                  </m.button>
                ))}
              </AnimatePresence>
            </m.div>
          )}
        </div>

        <aside className="sticky top-4 h-fit rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          {selectedAsset ? (
            <m.div
              key={selectedAsset.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                {selectedAsset.kind === "document" || !selectedAsset.dataUrl ? (
                  <div className="grid aspect-video place-items-center text-muted-foreground">
                    <FileText className="h-12 w-12" />
                  </div>
                ) : (
                  <img
                    src={selectedAsset.dataUrl}
                    alt={selectedAsset.name}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-name" className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("common.name")}
                </Label>
                <Input
                  id="asset-name"
                  defaultValue={selectedAsset.name}
                  onBlur={(e) => {
                    if (e.target.value !== selectedAsset.name) void rename(selectedAsset.id, e.target.value);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta label={t("media.col.kind")} value={selectedAsset.kind === "image" ? t("media.stat.photos") : selectedAsset.kind === "signature" ? t("media.stat.signatures") : selectedAsset.kind === "document" ? t("media.documents") : selectedAsset.kind} />
                <Meta label={t("media.col.size")} value={formatBytes(selectedAsset.sizeBytes)} />
                <Meta label={t("media.col.uploaded")} value={formatDate(selectedAsset.uploadedAt)} />
                <Meta label={t("media.col.by")} value={selectedAsset.uploadedBy} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("media.col.tags")}</Label>
                <div className="flex flex-wrap gap-1">
                  {selectedAsset.tags.map((t) => (
                    <span
                      key={t}
                      className="group/tag inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs"
                    >
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          retag(
                            selectedAsset.id,
                            selectedAsset.tags.filter((x) => x !== t),
                          )
                        }
                        className="opacity-0 transition-opacity group-hover/tag:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(selectedAsset, tagInput);
                    }
                  }}
                  placeholder={t("media.addTagPlaceholder")}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => {
                  void remove(selectedAsset.id);
                  setSelected(null);
                  toast.success(t("media.delete.success"));
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </m.div>
          ) : (
            <div className="grid h-64 place-items-center text-center text-sm text-muted-foreground">
              <div>
                <Images className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t("media.selectPrompt")}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className="text-gold">{icon}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium capitalize">{value}</p>
    </div>
  );
}
