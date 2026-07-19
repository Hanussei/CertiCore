import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, LazyMotion, domMax, m } from "framer-motion";
import { Sidebar } from "@/components/app/Sidebar";
import { TopBar } from "@/components/app/TopBar";
import { PageTransition } from "@/components/app/PageTransition";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useBrandingStore } from "@/stores/branding";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function shellPalette(isDark: boolean) {
  return isDark
    ? {
        base: "oklch(0.11 0.04 265)",
        gridColor: "oklch(1 0 0)",
        gridOpacity: 0.06,
        orb1Op: 0.28,
        orb2Op: 0.4,
        orb3Op: 0.18,
        rail: "oklch(0.76 0.14 78)",
      }
    : {
        base: "oklch(0.97 0.008 90)",
        gridColor: "oklch(0.2 0.05 260)",
        gridOpacity: 0.05,
        orb1Op: 0.32,
        orb2Op: 0.24,
        orb3Op: 0.14,
        rail: "oklch(0.66 0.16 60)",
      };
}

function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const theme = useUIStore((s) => s.theme);
  const branding = useBrandingStore((s) => s.branding);
  const isDark = theme === "dark";
  const p = shellPalette(isDark);
  const brandAccent = branding.accentColor || p.rail;
  const brandPrimary = branding.primaryColor || "oklch(0.20 0.055 260)";

  if (status !== "ready") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!user || user.forcePasswordChange) return <Navigate to="/auth" replace />;

  return (
    <LazyMotion features={domMax} strict>
      <div
        data-shell={isDark ? "dark" : "light"}
        className="relative flex h-screen w-full overflow-hidden text-white"
        style={
          {
            backgroundColor: p.base,
            "--brand-accent": brandAccent,
            "--brand-primary": brandPrimary,
            // Rewire legacy design tokens so `text-gold` / `bg-gold` / `border-gold`
            // (and navy) resolve to the live branding colors everywhere in the shell.
            "--gold": brandAccent,
            "--gold-soft": `color-mix(in oklch, ${brandAccent} 70%, white)`,
            "--navy": brandPrimary,
          } as React.CSSProperties
        }
      >

        {/* Ambient background — matches activation/auth */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <m.div
            animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: p.orb1Op, backgroundColor: brandAccent }}
            className="absolute -left-40 top-[-15%] h-[560px] w-[560px] rounded-full blur-[140px]"

          />
          <m.div
            animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 30, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ opacity: p.orb2Op }}
            className="absolute -right-40 bottom-[-20%] h-[640px] w-[640px] rounded-full bg-[oklch(0.42_0.2_285)] blur-[160px]"
          />
          <m.div
            animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: p.orb3Op }}
            className="absolute left-1/3 top-1/3 h-[380px] w-[380px] rounded-full bg-[oklch(0.55_0.2_220)] blur-[130px]"
          />

          <div
            className="absolute inset-0"
            style={{
              opacity: p.gridOpacity,
              backgroundImage: `linear-gradient(${p.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${p.gridColor} 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />

          {[...Array(12)].map((_, i) => (
            <m.div
              key={i}
              className="absolute h-1 w-1 rounded-full"
              style={{ backgroundColor: brandAccent }}
              initial={{ x: `${(i * 73) % 100}%`, y: `${(i * 47) % 100}%`, opacity: 0 }}
              animate={{
                y: [`${(i * 47) % 100}%`, `${((i * 47) % 100) - 20}%`],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 6 + (i % 5),
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeInOut",
              }}
            />
          ))}

          <m.div
            className="absolute inset-x-0 h-px opacity-30"
            style={{ background: `linear-gradient(90deg, transparent, ${brandAccent}, transparent)` }}
            animate={{ y: ["0vh", "100vh"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="relative z-10 flex h-full w-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="relative flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition k={pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
