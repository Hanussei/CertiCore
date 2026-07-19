import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { LazyMotion, domMax, m, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  ShieldCheck,
  Cpu,
  WifiOff,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLicenseStore } from "@/stores/license";
import { LICENSE_DEMO_HINTS } from "@/lib/bridge/license";
import { useUIStore } from "@/stores/ui";
import { ThemeToggle } from "@/components/app/ThemeToggle";

export const Route = createFileRoute("/activation")({
  head: () => ({
    meta: [
      { title: "Activate — CertiCore" },
      { name: "description", content: "Activate this CertiCore workstation." },
    ],
  }),
  component: ActivationPage,
});

const SEGMENTS = 4;
const SEG_LEN = 4;

function paletteFor(isDark: boolean) {
  return isDark
    ? {
        base: "oklch(0.11 0.04 265)",
        fg: "oklch(1 0 0)",
        text: "text-white",
        subtle: "text-white/55",
        dim: "text-white/40",
        micro: "text-white/35",
        card: "linear-gradient(140deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0.02))",
        cardBorder: "border-white/15",
        cardShadow:
          "0 30px 80px -20px oklch(0 0 0 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.1)",
        input: "border-white/15 bg-white/[0.05] text-white placeholder:text-white/20 focus:bg-white/[0.08]",
        divider: "bg-white/10",
        hintBg: "linear-gradient(140deg, oklch(1 0 0 / 0.04), oklch(1 0 0 / 0.01))",
        hintBorder: "border-white/10",
        hintText: "text-white/85",
        featureBorder: "border-white/5",
        featureBg: "oklch(1 0 0 / 0.02)",
        gridColor: "oklch(1 0 0)",
        gridOpacity: 0.07,
        orb1Op: 0.3,
        orb2Op: 0.45,
        orb3Op: 0.2,
        spotColor: "oklch(0.86 0.12 85 / 0.12)",
      }
    : {
        base: "oklch(0.97 0.008 90)",
        fg: "oklch(0.18 0.03 260)",
        text: "text-[oklch(0.18_0.03_260)]",
        subtle: "text-[oklch(0.35_0.03_260)]",
        dim: "text-[oklch(0.45_0.03_260)]",
        micro: "text-[oklch(0.5_0.03_260)]",
        card: "linear-gradient(140deg, oklch(1 0 0 / 0.7), oklch(1 0 0 / 0.4))",
        cardBorder: "border-[oklch(0.18_0.03_260)]/10",
        cardShadow:
          "0 30px 80px -20px oklch(0.2 0.05 260 / 0.15), inset 0 1px 0 oklch(1 0 0 / 0.8)",
        input:
          "border-[oklch(0.18_0.03_260)]/15 bg-white/60 text-[oklch(0.18_0.03_260)] placeholder:text-[oklch(0.18_0.03_260)]/25 focus:bg-white/80",
        divider: "bg-[oklch(0.18_0.03_260)]/10",
        hintBg: "linear-gradient(140deg, oklch(1 0 0 / 0.5), oklch(1 0 0 / 0.2))",
        hintBorder: "border-[oklch(0.18_0.03_260)]/10",
        hintText: "text-[oklch(0.25_0.03_260)]",
        featureBorder: "border-[oklch(0.18_0.03_260)]/8",
        featureBg: "oklch(1 0 0 / 0.4)",
        gridColor: "oklch(0.2 0.05 260)",
        gridOpacity: 0.05,
        orb1Op: 0.35,
        orb2Op: 0.3,
        orb3Op: 0.18,
        spotColor: "oklch(0.66 0.16 60 / 0.18)",
      };
}

function ActivationPage() {
  const license = useLicenseStore((s) => s.license);
  const status = useLicenseStore((s) => s.status);
  const activate = useLicenseStore((s) => s.activate);
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const p = paletteFor(isDark);

  const [segs, setSegs] = useState<string[]>(Array(SEGMENTS).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const spotX = useTransform(sx, (v) => `${v * 100}%`);
  const spotY = useTransform(sy, (v) => `${v * 100}%`);
  const tiltX = useTransform(sy, (v) => (v - 0.5) * -6);
  const tiltY = useTransform(sx, (v) => (v - 0.5) * 6);
  const orb1X = useTransform(sx, (v) => (v - 0.5) * -60);
  const orb1Y = useTransform(sy, (v) => (v - 0.5) * -60);
  const orb2X = useTransform(sx, (v) => (v - 0.5) * 80);
  const orb2Y = useTransform(sy, (v) => (v - 0.5) * 80);
  const spotBg = useTransform(
    [spotX, spotY],
    ([x, y]) => `radial-gradient(600px circle at ${x} ${y}, ${p.spotColor}, transparent 60%)`,
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mx.set(e.clientX / window.innerWidth);
      my.set(e.clientY / window.innerHeight);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  if (license) return <Navigate to="/auth" replace />;

  const code = segs.join("-");
  const filledCount = segs.reduce((a, s) => a + s.length, 0);
  const progress = filledCount / (SEGMENTS * SEG_LEN);
  const isComplete = segs.every((s) => s.length === SEG_LEN);

  function updateSeg(i: number, raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, SEG_LEN);
    const next = [...segs];
    next[i] = clean;
    setSegs(next);
    if (clean.length === SEG_LEN && i < SEGMENTS - 1) inputs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (text.length >= SEG_LEN * SEGMENTS) {
      e.preventDefault();
      const parts: string[] = [];
      for (let i = 0; i < SEGMENTS; i++) parts.push(text.slice(i * SEG_LEN, (i + 1) * SEG_LEN));
      setSegs(parts);
      inputs.current[SEGMENTS - 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && segs[i].length === 0 && i > 0) inputs.current[i - 1]?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) return;
    setSubmitting(true);
    const ok = await activate(code);
    setSubmitting(false);
    if (ok) {
      toast.success("Workstation activated");
      navigate({ to: "/auth" });
    } else {
      toast.error(useLicenseStore.getState().error ?? "Activation failed");
      setSegs(Array(SEGMENTS).fill(""));
      inputs.current[0]?.focus();
    }
  }

  const loading = submitting || status === "loading";

  return (
    <LazyMotion features={domMax} strict>
      <div
        className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${p.text}`}
      style={{ backgroundColor: p.base }}
    >
      {/* Ambient Layer */}
      <div className="pointer-events-none absolute inset-0">
        <m.div
          style={{ x: orb1X, y: orb1Y, opacity: p.orb1Op }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 top-[-15%] h-[560px] w-[560px] rounded-full bg-[oklch(0.76_0.15_78)] blur-[140px]"
        />
        <m.div
          style={{ x: orb2X, y: orb2Y, opacity: p.orb2Op }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -right-40 bottom-[-20%] h-[640px] w-[640px] rounded-full bg-[oklch(0.42_0.2_285)] blur-[160px]"
        />
        <m.div
          animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ opacity: p.orb3Op }}
          className="absolute left-1/3 top-1/3 h-[380px] w-[380px] rounded-full bg-[oklch(0.55_0.2_220)] blur-[130px]"
        />

        <div
          className="absolute inset-0"
          style={{
            opacity: p.gridOpacity,
            backgroundImage: `linear-gradient(${p.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${p.gridColor} 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        <m.div className="absolute inset-0" style={{ background: spotBg }} />

        {[...Array(14)].map((_, i) => (
          <m.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[oklch(0.76_0.14_78)]"
            initial={{ x: `${(i * 73) % 100}%`, y: `${(i * 47) % 100}%`, opacity: 0 }}
            animate={{
              y: [`${(i * 47) % 100}%`, `${((i * 47) % 100) - 20}%`],
              opacity: [0, 0.6, 0],
            }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          />
        ))}

        <m.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.76_0.14_78)] to-transparent opacity-40"
          animate={{ y: ["0vh", "100vh"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Theme toggle (floating) */}
      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* Brand */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex items-center gap-3"
        >
          <m.div
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] shadow-[0_0_40px_-8px_oklch(0.76_0.14_78/0.7)]"
          >
            <m.div
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            />
            <span className="relative font-display text-2xl font-bold text-[oklch(0.15_0.05_260)]">C</span>
          </m.div>
          <div>
            <div className="font-display text-xl font-bold tracking-wide">CertiCore</div>
            <div className={`text-[10px] uppercase tracking-[0.25em] ${p.dim}`}>
              Workstation Activation
            </div>
          </div>
        </m.div>

        {/* Glass Card */}
        <m.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }}
          className="relative w-full max-w-xl [transform-style:preserve-3d]"
        >
          <m.div
            className="absolute -inset-[1px] rounded-2xl opacity-70"
            style={{
              background:
                "conic-gradient(from 0deg, oklch(0.86 0.12 85 / 0.6), transparent 25%, transparent 50%, oklch(0.55 0.2 285 / 0.5) 75%, oklch(0.86 0.12 85 / 0.6))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />

          <div
            className={`relative rounded-2xl border p-8 sm:p-10 ${p.cardBorder}`}
            style={{
              background: p.card,
              backdropFilter: "blur(28px) saturate(160%)",
              boxShadow: p.cardShadow,
            }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] via-transparent to-transparent" />

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.66_0.16_60)]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>First-time setup</span>
              <m.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`ml-auto flex items-center gap-1.5 text-[10px] ${p.dim}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Secure channel
              </m.span>
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="relative mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Activate this workstation
            </m.h1>
            <m.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              className={`relative mt-2 text-sm ${p.subtle}`}
            >
              Enter the license key that came with your CertiCore purchase. The key binds this
              installation to your organization — one activation per machine.
            </m.p>

            <form onSubmit={onSubmit} className="relative mt-8 space-y-6">
              <div>
                <div className={`mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest ${p.subtle}`}>
                  <span>License key</span>
                  <m.span
                    key={filledCount}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-[10px] text-[oklch(0.66_0.16_60)]"
                  >
                    {filledCount}/{SEGMENTS * SEG_LEN}
                  </m.span>
                </div>

                <div className={`mb-4 h-0.5 w-full overflow-hidden rounded-full ${p.divider}`}>
                  <m.div
                    className="h-full bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)]"
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>

                <m.div
                  animate={submitting ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  {segs.map((seg, i) => (
                    <div key={i} className="flex flex-1 items-center gap-2 sm:gap-3">
                      <div className="relative flex-1">
                        <AnimatePresence>
                          {focused === i && (
                            <m.div
                              layoutId="seg-focus-glow"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute -inset-1 rounded-xl bg-[oklch(0.76_0.14_78)]/30 blur-md"
                            />
                          )}
                        </AnimatePresence>
                        <m.input
                          ref={(el) => {
                            inputs.current[i] = el;
                          }}
                          value={seg}
                          onChange={(e) => updateSeg(i, e.target.value)}
                          onPaste={handlePaste}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          onFocus={() => setFocused(i)}
                          onBlur={() => setFocused((f) => (f === i ? null : f))}
                          maxLength={SEG_LEN}
                          autoComplete="off"
                          spellCheck={false}
                          aria-label={`License segment ${i + 1}`}
                          whileFocus={{ scale: 1.03 }}
                          className={`relative w-full rounded-xl border px-2 py-3.5 text-center font-mono text-base font-semibold uppercase tracking-[0.35em] outline-none backdrop-blur-md transition-colors focus:border-[oklch(0.66_0.16_60)]/70 sm:text-lg ${p.input}`}
                          placeholder="····"
                          style={{
                            boxShadow:
                              seg.length === SEG_LEN
                                ? "0 0 20px -4px oklch(0.76 0.14 78 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.15)"
                                : "inset 0 1px 0 oklch(1 0 0 / 0.08)",
                          }}
                        />
                        <AnimatePresence>
                          {seg.length === SEG_LEN && (
                            <m.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-[oklch(0.76_0.14_78)] text-[10px] font-bold text-[oklch(0.15_0.05_260)]"
                            >
                              ✓
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {i < SEGMENTS - 1 && (
                        <m.span
                          animate={{ opacity: segs[i].length === SEG_LEN ? 1 : 0.3 }}
                          className="text-[oklch(0.66_0.16_60)]"
                        >
                          —
                        </m.span>
                      )}
                    </div>
                  ))}
                </m.div>
                <div className={`mt-2 text-[11px] ${p.micro}`}>
                  Tip: paste your full key anywhere to auto-fill.
                </div>
              </div>

              <m.div whileHover={{ scale: isComplete && !loading ? 1.01 : 1 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  disabled={loading || !isComplete}
                  className="group relative h-12 w-full overflow-hidden bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] font-medium text-[oklch(0.15_0.05_260)] shadow-[0_10px_30px_-10px_oklch(0.76_0.14_78/0.9)] transition-all hover:from-[oklch(0.9_0.1_85)] hover:to-[oklch(0.72_0.16_65)] hover:shadow-[0_15px_40px_-10px_oklch(0.76_0.14_78/1)] disabled:opacity-40"
                >
                  {isComplete && !loading && (
                    <m.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <m.span
                          key="loading"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="inline-flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying key…
                        </m.span>
                      ) : (
                        <m.span
                          key="idle"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="inline-flex items-center gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          Activate CertiCore
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </m.span>
                      )}
                    </AnimatePresence>
                  </span>
                </Button>
              </m.div>
            </form>

            <div className="relative mt-8">
              <div className="mb-3 flex items-center gap-3">
                <div className={`h-px flex-1 ${p.divider}`} />
                <span className={`text-[10px] uppercase tracking-[0.25em] ${p.micro}`}>
                  Prototype keys
                </span>
                <div className={`h-px flex-1 ${p.divider}`} />
              </div>
              <div className="grid gap-2">
                {LICENSE_DEMO_HINTS.map((h, idx) => (
                  <m.button
                    key={h.code}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.08 }}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSegs(h.code.split("-"));
                      inputs.current[SEGMENTS - 1]?.focus();
                    }}
                    className={`group relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-[oklch(0.66_0.16_60)]/50 ${p.hintBorder}`}
                    style={{ background: p.hintBg, backdropFilter: "blur(12px)" }}
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[oklch(0.76_0.14_78)]/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <div className="relative flex min-w-0 items-center gap-2.5">
                      <m.span
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          h.tier === "enterprise"
                            ? "bg-[oklch(0.66_0.16_60)] shadow-[0_0_8px_oklch(0.76_0.14_78)]"
                            : h.tier === "pro"
                              ? "bg-[oklch(0.55_0.2_220)] shadow-[0_0_8px_oklch(0.55_0.2_220)]"
                              : "bg-current opacity-40"
                        }`}
                      />
                      <span className={`truncate font-mono text-xs ${p.hintText}`}>{h.code}</span>
                    </div>
                    <div className={`relative flex items-center gap-3 pl-3 text-[10px] uppercase tracking-widest ${p.dim} group-hover:text-[oklch(0.66_0.16_60)]`}>
                      <span>{h.tier}</span>
                      <span className="opacity-40">·</span>
                      <span>{h.seats} seats</span>
                    </div>
                  </m.button>
                ))}
              </div>
            </div>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className={`mt-8 grid w-full max-w-xl grid-cols-1 gap-2 text-xs sm:grid-cols-3 ${p.dim}`}
        >
          {[
            { Icon: WifiOff, label: "Offline-capable activation" },
            { Icon: Fingerprint, label: "Bound to this machine" },
            { Icon: ShieldCheck, label: "Signed & verified" },
          ].map(({ Icon, label }, i) => (
            <m.div
              key={label}
              whileHover={{ y: -2 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className={`inline-flex cursor-default items-center gap-2 rounded-lg border px-3 py-2 ${p.featureBorder}`}
              style={{ background: p.featureBg, backdropFilter: "blur(10px)" }}
            >
              <Icon className="h-3.5 w-3.5 text-[oklch(0.66_0.16_60)]" />
              {label}
            </m.div>
          ))}
        </m.div>

        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className={`mt-6 inline-flex items-center gap-2 text-[11px] ${p.micro}`}
        >
          <Cpu className="h-3 w-3" />
          Need a key? Contact your CertiCore administrator.
        </m.div>
      </div>
      </div>
    </LazyMotion>
  );
}
