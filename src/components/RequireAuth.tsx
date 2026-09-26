"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useSession } from "@/lib/auth";
import { Spinner } from "./ui";

/** Anything behind the dashboard needs a signed-in wallet on Base Sepolia. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const waiting = status === "reconnecting" || status === "checking";
  const allowed = status === "signed-in";

  useEffect(() => {
    if (!waiting && !allowed) router.replace(`/?from=${encodeURIComponent(pathname)}`);
  }, [waiting, allowed, pathname, router]);

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-2">
        <Spinner className="size-6" />
      </div>
    );
  }
  return <>{children}</>;
}
