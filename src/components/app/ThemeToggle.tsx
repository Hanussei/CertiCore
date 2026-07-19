import { m, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useUIStore } from "@/stores/ui";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useUIStore((s) => s.theme);
  const toggle = useUIStore((s) => s.toggleTheme);
  const isDark = theme === "dark";
  return (
    <m.button
      type="button"
      onClick={toggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label="Toggle theme"
      className={`group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border transition-colors ${
        isDark
          ? "border-white/15 bg-white/[0.06] text-white/80 hover:border-[oklch(0.86_0.09_85)]/50 hover:text-[oklch(0.86_0.09_85)]"
          : "border-[oklch(0.15_0.05_260)]/15 bg-[oklch(0.15_0.05_260)]/[0.04] text-[oklch(0.2_0.05_260)] hover:border-[oklch(0.66_0.16_60)]/50 hover:text-[oklch(0.55_0.18_65)]"
      } ${className}`}
      style={{ backdropFilter: "blur(12px)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <m.span
            key="moon"
            initial={{ y: -14, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 14, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25 }}
            className="absolute"
          >
            <Moon className="h-4 w-4" />
          </m.span>
        ) : (
          <m.span
            key="sun"
            initial={{ y: -14, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 14, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25 }}
            className="absolute"
          >
            <Sun className="h-4 w-4" />
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}
