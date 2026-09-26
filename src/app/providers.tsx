"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";
import { Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { SessionWatcher } from "@/lib/auth";
import { config } from "@/wagmi";

const subscribe = () => () => {};
/** false during SSR and the hydration pass, true after. */
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2_000,
            refetchOnWindowFocus: true,
            // a 401/403/404 won't fix itself by retrying
            retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
          },
        },
      }),
  );
  // Everything here depends on the wallet and localStorage, which only exist in
  // the browser. Rendering it on the server would mean a guaranteed
  // "signed out" first paint (and a bounce to /) before wagmi reconnects, so the
  // server sends a spinner and the app renders once it's in the browser.
  const mounted = useMounted();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionWatcher />
        {mounted ? (
          children
        ) : (
          <div className="grid min-h-screen place-items-center text-ink-2">
            <Spinner className="size-6" />
          </div>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
