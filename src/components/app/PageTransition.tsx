import { m } from "framer-motion";
import type { ReactNode } from "react";

export function PageTransition({ children, k }: { children: ReactNode; k: string }) {
  return (
    <m.div
      key={k}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      {children}
    </m.div>
  );
}

export function StubPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full place-items-center px-6 py-12">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <span className="font-display text-xl font-bold">C</span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-wide">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
