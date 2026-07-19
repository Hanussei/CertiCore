import { useEffect, useState } from "react";

type Props = {
  date: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
};

/**
 * Hydration-safe date formatter for SSR.
 * Renders consistent ISO date on server/hydration pass, then updates to
 * client-specific locale format after mounting.
 */
export function ClientOnlyDate({ date, options, fallback = "—" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) return <>{fallback}</>;
  const d = new Date(date);
  if (isNaN(d.getTime())) return <>{fallback}</>;

  if (!mounted) {
    return <>{d.toISOString().slice(0, 10)}</>;
  }

  return <>{d.toLocaleDateString(undefined, options)}</>;
}
