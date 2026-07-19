import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { LazyMotion, domMax, m, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import { useLicenseStore } from "@/stores/license";
import { useT } from "@/hooks/use-t";
import { useUIStore } from "@/stores/ui";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { completeFirstTimeSetup, getSecurityQuestions, resetPasswordWithAnswers } from "@/lib/bridge/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CertiCore" },
      { name: "description", content: "Access the CertiCore workspace." },
    ],
  }),
  component: AuthPage,
});

function paletteFor(isDark: boolean) {
  return isDark
    ? {
        base: "oklch(0.13 0.04 260)",
        text: "text-white",
        subtle: "text-white/60",
        dim: "text-white/50",
        micro: "text-white/40",
        card: "oklch(0.16 0.04 260 / 0.8)",
        cardBorder: "border-white/10",
        input:
          "border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-[oklch(0.66_0.16_60)]/60 focus-visible:ring-[oklch(0.66_0.16_60)]/20",
        divider: "bg-white/10",
        featureBox: "border-white/10 bg-white/[0.03]",
        gridColor: "oklch(1 0 0)",
        gridOpacity: 0.06,
        showcaseText: "text-white/60",
        orb1Op: 0.25,
        orb2Op: 0.4,
      }
    : {
        base: "oklch(0.97 0.008 90)",
        text: "text-[oklch(0.18_0.03_260)]",
        subtle: "text-[oklch(0.35_0.03_260)]",
        dim: "text-[oklch(0.45_0.03_260)]",
        micro: "text-[oklch(0.5_0.03_260)]",
        card: "oklch(1 0 0 / 0.6)",
        cardBorder: "border-[oklch(0.18_0.03_260)]/10",
        input:
          "border-[oklch(0.18_0.03_260)]/15 bg-white/60 text-[oklch(0.18_0.03_260)] placeholder:text-[oklch(0.18_0.03_260)]/30 focus-visible:border-[oklch(0.66_0.16_60)]/60 focus-visible:ring-[oklch(0.66_0.16_60)]/20",
        divider: "bg-[oklch(0.18_0.03_260)]/10",
        featureBox: "border-[oklch(0.18_0.03_260)]/10 bg-white/40",
        gridColor: "oklch(0.2 0.05 260)",
        gridOpacity: 0.05,
        showcaseText: "text-[oklch(0.35_0.03_260)]",
        orb1Op: 0.3,
        orb2Op: 0.25,
      };
}

const PRESET_QUESTIONS = [
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first pet?",
  "What was the make of your first car?",
];

type AuthMode = "signin" | "first_time" | "forgot_request" | "forgot_verify";

function AuthPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const signInStore = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();

  // Mode management
  const [mode, setMode] = useState<AuthMode>("signin");

  // Sign-in / General state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Temporary container for first-time session
  const [tempUserId, setTempUserId] = useState("");

  // First-time setup parameters
  const [newPassword, setNewPassword] = useState("");
  const [setupQ1, setSetupQ1] = useState(PRESET_QUESTIONS[0]);
  const [setupAns1, setSetupAns1] = useState("");
  const [setupQ2, setSetupQ2] = useState(PRESET_QUESTIONS[1]);
  const [setupAns2, setSetupAns2] = useState("");

  // Password recovery parameters
  const [recoveredQ1, setRecoveredQ1] = useState("");
  const [recoveredQ2, setRecoveredQ2] = useState("");
  const [recoveryAns1, setRecoveryAns1] = useState("");
  const [recoveryAns2, setRecoveryAns2] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");

  const license = useLicenseStore((s) => s.license);
  const licStatus = useLicenseStore((s) => s.status);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === "dark";
  const p = paletteFor(isDark);

  if (licStatus === "ready" && !license) return <Navigate to="/activation" replace />;
  if (user && !user.forcePasswordChange && mode === "signin") return <Navigate to="/app/dashboard" replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await signInStore(username, password);
    setSubmitting(false);

    if (ok) {
      const activeUser = useAuthStore.getState().user;
      if (activeUser?.forcePasswordChange) {
        setTempUserId(activeUser.id);
        setMode("first_time");
        toast.info(t("auth.toast.firstTime"));
      } else {
        toast.success(t("auth.toast.signedIn"));
        navigate({ to: "/app/dashboard" });
      }
    } else {
      toast.error(useAuthStore.getState().error ?? t("auth.toast.signInFailed"));
    }
  }

  async function handleFirstTimeSetup(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t("auth.toast.setupPasswordMin"));
      return;
    }
    const isManager = user?.role === "manager";
    if (isManager && (setupAns1.trim() === "" || setupAns2.trim() === "")) {
      toast.error(t("auth.toast.setupAnswerAll"));
      return;
    }

    setSubmitting(true);
    const res = await completeFirstTimeSetup(
      tempUserId,
      newPassword,
      isManager ? setupQ1 : "",
      isManager ? setupAns1 : "",
      isManager ? setupQ2 : "",
      isManager ? setupAns2 : ""
    );
    setSubmitting(false);

    if (res.ok) {
      toast.success(t("auth.toast.setupSuccess"));
      // Complete sign in
      const updatedStoreUser = useAuthStore.getState().user;
      if (updatedStoreUser) {
        updatedStoreUser.forcePasswordChange = false;
        useAuthStore.setState({ user: updatedStoreUser });
      }
      navigate({ to: "/app/dashboard" });
    } else {
      toast.error(res.error.message || t("auth.toast.setupFailed"));
    }
  }

  async function requestRecoveryQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!username) {
      toast.error(t("auth.toast.recoveryEnterUsername"));
      return;
    }

    setSubmitting(true);
    const res = await getSecurityQuestions(username);
    setSubmitting(false);

    if (res.ok) {
      setRecoveredQ1(res.data.q1);
      setRecoveredQ2(res.data.q2);
      setMode("forgot_verify");
    } else {
      toast.error(res.error.message || t("auth.toast.recoveryGetFailed"));
    }
  }

  async function handlePasswordRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (recoveryNewPassword.length < 6) {
      toast.error(t("auth.toast.setupPasswordMin"));
      return;
    }

    setSubmitting(true);
    const res = await resetPasswordWithAnswers(username, recoveryAns1, recoveryAns2, recoveryNewPassword);
    setSubmitting(false);

    if (res.ok) {
      toast.success(t("auth.toast.resetSuccess"));
      setPassword("");
      setMode("signin");
    } else {
      toast.error(res.error.message || t("auth.toast.resetFailed"));
    }
  }

  const loading = submitting || status === "loading";

  return (
    <LazyMotion features={domMax} strict>
      <div
        className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${p.text}`}
      style={{ backgroundColor: p.base }}
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-[oklch(0.76_0.14_78)] blur-[140px]"
          style={{ opacity: p.orb1Op }}
        />
        <div
          className="absolute -right-40 bottom-[-15%] h-[600px] w-[600px] rounded-full bg-[oklch(0.42_0.2_285)] blur-[160px]"
          style={{ opacity: p.orb2Op }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: p.gridOpacity,
            backgroundImage: `linear-gradient(${p.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${p.gridColor} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="absolute right-6 top-6 z-20">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Left — brand showcase */}
        <div className="relative hidden flex-col justify-between p-12 lg:flex">
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] shadow-[0_0_40px_-8px_oklch(0.76_0.14_78/0.6)]">
              <span className="font-display text-2xl font-bold text-[oklch(0.15_0.05_260)]">C</span>
            </div>
            <div>
              <div className="font-display text-xl font-bold tracking-wide">CertiCore</div>
              <div className={`text-[10px] uppercase tracking-[0.25em] ${p.dim}`}>
                {t("auth.showcase.inspectCert")}
              </div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="space-y-8"
          >
            <div>
              <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest text-[oklch(0.66_0.16_60)] backdrop-blur ${p.featureBox}`}>
                <Sparkles className="h-3 w-3" />
                {t("auth.showcase.feature")}
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
                {t("auth.showcase.title1")}
                <br />
                <span className="bg-gradient-to-r from-[oklch(0.9_0.12_85)] via-[oklch(0.78_0.14_78)] to-[oklch(0.66_0.16_60)] bg-clip-text text-transparent">
                  {t("auth.showcase.title2")}
                </span>
              </h1>
              <p className={`mt-5 max-w-md text-[15px] leading-relaxed ${p.showcaseText}`}>
                {t("auth.showcase.desc")}
              </p>
            </div>

            <div className="grid max-w-md grid-cols-3 gap-3">
              {[
                { k: t("auth.showcase.stat1.k"), v: t("auth.showcase.stat1.v") },
                { k: t("auth.showcase.stat2.k"), v: t("auth.showcase.stat2.v") },
                { k: t("auth.showcase.stat3.k"), v: t("auth.showcase.stat3.v") },
              ].map((f) => (
                <div key={f.v} className={`rounded-xl border p-4 backdrop-blur ${p.featureBox}`}>
                  <div className="font-display text-2xl font-bold text-[oklch(0.66_0.16_60)]">
                    {f.k}
                  </div>
                  <div className={`mt-1 text-[11px] uppercase tracking-wider ${p.dim}`}>{f.v}</div>
                </div>
              ))}
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`flex items-center gap-2 text-xs ${p.micro}`}
          >
            <ShieldCheck className="h-4 w-4 text-[oklch(0.66_0.16_60)]" />
            {t("auth.showcase.footer")}
          </m.div>
        </div>

        {/* Right — form container card */}
        <div className="relative flex items-center justify-center p-6 sm:p-10">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[420px]"
          >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[oklch(0.86_0.09_85)]/40 via-transparent to-transparent" />
            <div
              className={`relative rounded-2xl border p-8 shadow-[0_30px_80px_-20px_oklch(0_0_0/0.3)] backdrop-blur-xl ${p.cardBorder}`}
              style={{ background: p.card }}
            >
              <div className="mb-8 flex items-center gap-2 lg:hidden">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)]">
                  <span className="font-display text-lg font-bold text-[oklch(0.15_0.05_260)]">
                    C
                  </span>
                </div>
                <span className="font-display text-lg font-bold">CertiCore</span>
              </div>

              <AnimatePresence mode="wait">
                {/* SIGN IN STATE */}
                {mode === "signin" && (
                  <m.div
                    key="signin"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-[oklch(0.66_0.16_60)]">
                        {t("auth.title")}
                      </div>
                      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
                        {t("auth.welcome")}
                      </h2>
                      <p className={`mt-1.5 text-sm ${p.dim}`}>{t("auth.subtitle")}</p>
                    </div>

                    <form onSubmit={handleSignIn} className="mt-7 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="username" className={`text-[11px] uppercase tracking-widest ${p.subtle}`}>
                          {t("auth.username")}
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          placeholder="e.g. name@mgr or name@inc"
                          className={`h-11 ${p.input}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className={`text-[11px] uppercase tracking-widest ${p.subtle}`}>
                            {t("auth.password")}
                          </Label>
                          <button
                            type="button"
                            onClick={() => setMode("forgot_request")}
                            className="text-[11px] font-medium text-[oklch(0.66_0.16_60)] hover:underline"
                          >
                            {t("auth.forgotPin")}
                          </button>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className={`h-11 ${p.input}`}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="group relative h-11 w-full overflow-hidden bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] font-medium text-[oklch(0.15_0.05_260)] shadow-[0_10px_30px_-10px_oklch(0.76_0.14_78/0.8)] hover:from-[oklch(0.9_0.1_85)] hover:to-[oklch(0.72_0.16_65)]"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center gap-2">
                             {t("auth.submit")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </m.div>
                )}

                {/* FIRST TIME PASSWORD FORCE SETUP */}
                {mode === "first_time" && (
                  <m.div
                    key="first_time"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-[oklch(0.66_0.16_60)]">
                        {t("auth.firstTime.title")}
                      </div>
                      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                        {t("auth.firstTime.heading")}
                      </h2>
                      <p className={`mt-1.5 text-xs ${p.dim}`}>
                        {t("auth.firstTime.desc")}
                      </p>
                    </div>

                    <form onSubmit={handleFirstTimeSetup} className="mt-6 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-password" className={`text-[10px] uppercase tracking-widest ${p.subtle}`}>
                          {t("auth.firstTime.newPin")}
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder={t("auth.firstTime.placeholderPin")}
                          className={`h-10 ${p.input}`}
                        />
                      </div>

                      {user?.role === "manager" && (
                        <>
                          <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest ${p.subtle}`}>
                              {t("auth.firstTime.q1")}
                            </Label>
                            <select
                              value={setupQ1}
                              onChange={(e) => setSetupQ1(e.target.value)}
                              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${p.input.split(" ")[0]} bg-slate-900 text-white`}
                            >
                              {PRESET_QUESTIONS.map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="text"
                              placeholder={t("auth.firstTime.answer")}
                              value={setupAns1}
                              onChange={(e) => setSetupAns1(e.target.value)}
                              required
                              className={`h-10 ${p.input}`}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={`text-[10px] uppercase tracking-widest ${p.subtle}`}>
                              {t("auth.firstTime.q2")}
                            </Label>
                            <select
                              value={setupQ2}
                              onChange={(e) => setSetupQ2(e.target.value)}
                              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${p.input.split(" ")[0]} bg-slate-900 text-white`}
                            >
                              {PRESET_QUESTIONS.map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="text"
                              placeholder={t("auth.firstTime.answer")}
                              value={setupAns2}
                              onChange={(e) => setSetupAns2(e.target.value)}
                              required
                              className={`h-10 ${p.input}`}
                            />
                          </div>
                        </>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="group relative mt-2 h-10 w-full overflow-hidden bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] font-medium text-[oklch(0.15_0.05_260)] hover:from-[oklch(0.9_0.1_85)] hover:to-[oklch(0.72_0.16_65)]"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.firstTime.submit")}
                      </Button>
                    </form>
                  </m.div>
                )}

                {/* FORGOT PASSWORD REQUEST */}
                {mode === "forgot_request" && (
                  <m.div
                    key="forgot_request"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <button
                      onClick={() => setMode("signin")}
                      className={`inline-flex items-center gap-1 text-xs mb-4 hover:underline ${p.subtle}`}
                    >
                      <ArrowLeft className="h-3 w-3" /> {t("auth.recovery.backToSignIn")}
                    </button>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-[oklch(0.66_0.16_60)]">
                        {t("auth.recovery.title")}
                      </div>
                      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                        {t("auth.recovery.heading")}
                      </h2>
                      <p className={`mt-1.5 text-xs ${p.dim}`}>
                        {t("auth.recovery.desc")}
                      </p>
                    </div>

                    <form onSubmit={requestRecoveryQuestions} className="mt-6 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="rec-username" className={`text-[11px] uppercase tracking-widest ${p.subtle}`}>
                          {t("auth.username")}
                        </Label>
                        <Input
                          id="rec-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          placeholder="e.g. name@mgr"
                          className={`h-11 ${p.input}`}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="group relative h-11 w-full overflow-hidden bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] font-medium text-[oklch(0.15_0.05_260)] hover:from-[oklch(0.9_0.1_85)] hover:to-[oklch(0.72_0.16_65)]"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.recovery.submit")}
                      </Button>
                    </form>
                  </m.div>
                )}

                {/* FORGOT PASSWORD ANSWER VERIFICATION */}
                {mode === "forgot_verify" && (
                  <m.div
                    key="forgot_verify"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <button
                      onClick={() => setMode("forgot_request")}
                      className={`inline-flex items-center gap-1 text-xs mb-4 hover:underline ${p.subtle}`}
                    >
                      <ArrowLeft className="h-3 w-3" /> {t("common.back")}
                    </button>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-[oklch(0.66_0.16_60)]">
                        {t("auth.reset.title")}
                      </div>
                      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                        {t("auth.reset.heading")}
                      </h2>
                      <p className={`mt-1.5 text-xs ${p.dim}`}>
                        {t("auth.reset.desc")}
                      </p>
                    </div>

                    <form onSubmit={handlePasswordRecovery} className="mt-6 space-y-4">
                      <div className="space-y-1.5">
                        <Label className={`text-[10px] uppercase tracking-widest text-[oklch(0.66_0.16_60)]`}>
                          {t("auth.reset.q1", { question: recoveredQ1 })}
                        </Label>
                        <Input
                          type="text"
                          placeholder={t("auth.firstTime.answer")}
                          value={recoveryAns1}
                          onChange={(e) => setRecoveryAns1(e.target.value)}
                          required
                          className={`h-10 ${p.input}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className={`text-[10px] uppercase tracking-widest text-[oklch(0.66_0.16_60)]`}>
                          {t("auth.reset.q2", { question: recoveredQ2 })}
                        </Label>
                        <Input
                          type="text"
                          placeholder={t("auth.firstTime.answer")}
                          value={recoveryAns2}
                          onChange={(e) => setRecoveryAns2(e.target.value)}
                          required
                          className={`h-10 ${p.input}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className={`text-[10px] uppercase tracking-widest ${p.subtle}`}>
                          {t("auth.reset.title")}
                        </Label>
                        <Input
                          type="password"
                          placeholder={t("auth.firstTime.placeholderPin")}
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                          required
                          className={`h-10 ${p.input}`}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="group relative mt-2 h-10 w-full overflow-hidden bg-gradient-to-r from-[oklch(0.86_0.09_85)] to-[oklch(0.66_0.16_60)] font-medium text-[oklch(0.15_0.05_260)] hover:from-[oklch(0.9_0.1_85)] hover:to-[oklch(0.72_0.16_65)]"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.reset.submit")}
                      </Button>
                    </form>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        </div>
      </div>
      </div>
    </LazyMotion>
  );
}
