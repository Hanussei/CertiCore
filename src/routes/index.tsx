import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { useLicenseStore } from "@/stores/license";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const license = useLicenseStore((s) => s.license);
  const licStatus = useLicenseStore((s) => s.status);

  if (authStatus !== "ready" || licStatus !== "ready") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }
  if (!license) return <Navigate to="/activation" replace />;
  return <Navigate to={user ? "/app/dashboard" : "/auth"} replace />;
}
