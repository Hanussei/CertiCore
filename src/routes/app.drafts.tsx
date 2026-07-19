import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  FileClock,
  HardHat,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspectionsStore } from "@/stores/inspections";
import { useEquipmentStore } from "@/stores/equipment";
import { useTemplatesStore } from "@/stores/templates";
import { useT } from "@/hooks/use-t";


export const Route = createFileRoute("/app/drafts")({
  head: () => ({
    meta: [
      { title: "Drafts — CertiCore" },
      { name: "description", content: "In-progress inspections saved locally." },
    ],
  }),
  component: DraftsPage,
});

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DraftsPage() {
  const t = useT();

  const drafts = useInspectionsStore((s) => s.drafts);
  const status = useInspectionsStore((s) => s.status);
  const hydrate = useInspectionsStore((s) => s.hydrate);
  const removeDraft = useInspectionsStore((s) => s.removeDraft);
  const equipment = useEquipmentStore((s) => s.items);
  const eqStatus = useEquipmentStore((s) => s.status);
  const hydrateEq = useEquipmentStore((s) => s.hydrate);
  const templates = useTemplatesStore((s) => s.templates);
  const tplStatus = useTemplatesStore((s) => s.status);
  const hydrateTpl = useTemplatesStore((s) => s.hydrate);

  useEffect(() => {
    if (status === "idle") void hydrate();
    if (eqStatus === "idle") void hydrateEq();
    if (tplStatus === "idle") void hydrateTpl();
  }, [status, eqStatus, tplStatus, hydrate, hydrateEq, hydrateTpl]);

  const rows = useMemo(
    () =>
      drafts.map((d) => {
        const eq = equipment.find((e) => e.id === d.equipmentId);
        const tpl = templates.find((t) => t.id === d.templateId);
        const total = tpl?.sections.reduce((n, s) => n + s.fields.length, 0) ?? 0;
        const filled = Object.keys(d.answers).filter((k) => {
          const v = d.answers[k];
          return v !== null && v !== undefined && v !== "" && v !== false;
        }).length;
        return { d, eq, tpl, total, filled };
      }),
    [drafts, equipment, templates],
  );

  return (
    <div className="mx-auto flex h-full max-w-[1300px] flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("drafts.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("drafts.subtitle")}
        </p>

      </header>

      {status === "loading" ? (
        <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-border/60 bg-card/30 text-center">
          <div>
            <FileClock className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">{t("drafts.empty")}</p>
            <Button asChild className="mt-4 bg-gold text-black hover:bg-gold/90">
              <Link to="/app/inspections">{t("drafts.start")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {rows.map(({ d, eq, tpl, total, filled }) => {
              const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
              return (
                <m.article
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  className="group flex flex-col rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur transition-colors hover:border-gold/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-gold">
                      <HardHat className="h-4 w-4" />
                      <span className="font-mono text-[11px] uppercase tracking-wide">
                        {eq?.tag ?? "—"}
                      </span>
                    </div>
                    <span className="rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t("drafts.badge")}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">{eq?.name ?? t("drafts.unknownAsset")}</h3>
                  <p className="text-xs text-muted-foreground">{tpl?.name ?? "Template not found"}</p>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{filled} / {total} {t("drafts.fieldsCount")}</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/50">
                    <m.div
                      className="h-full bg-gradient-to-r from-gold to-amber-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t("drafts.updated")} {relative(d.updatedAt)} · {d.inspectorName}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        void removeDraft(d.id);
                        toast.success(t("drafts.discarded"));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild size="sm" className="h-8 gap-1 bg-gold text-black hover:bg-gold/90">
                      <Link to="/app/inspections" search={{ resumeId: d.id }}>
                        {t("drafts.resume")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </m.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
