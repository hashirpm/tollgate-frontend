import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "@/lib/auth";
import { Spinner } from "./ui";

/** Anything behind the dashboard needs a signed-in wallet on Base Sepolia. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();

  if (status === "reconnecting" || status === "checking") {
    return (
      <div className="grid min-h-screen place-items-center text-ink-2">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (status !== "signed-in") return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
