import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ComponentType, lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { WagmiProvider } from "wagmi";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import "./index.css";
import { ApiError } from "./lib/api";
import { Spinner } from "./components/ui";
import { SessionWatcher } from "./lib/auth";
import { ConnectPage } from "./pages/Connect";
import { config } from "./wagmi";

// Dashboard pages load on demand, so the sign-in screen stays light.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const OverviewPage = page(() => import("./pages/Overview"), "OverviewPage");
const EndpointsPage = page(() => import("./pages/Endpoints"), "EndpointsPage");
const EndpointFormPage = page(() => import("./pages/EndpointForm"), "EndpointFormPage");
const EndpointDetailPage = page(() => import("./pages/EndpointDetail"), "EndpointDetailPage");
const PaymentsPage = page(() => import("./pages/Payments"), "PaymentsPage");
const ClaudePage = page(() => import("./pages/Claude"), "ClaudePage");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2_000,
      refetchOnWindowFocus: true,
      // a 401/403/404 won't fix itself by retrying
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SessionWatcher />
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="grid min-h-[50vh] place-items-center text-ink-2">
                <Spinner className="size-6" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<ConnectPage />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<OverviewPage />} />
                <Route path="/endpoints" element={<EndpointsPage />} />
                <Route path="/endpoints/new" element={<EndpointFormPage />} />
                <Route path="/endpoints/:id" element={<EndpointDetailPage />} />
                <Route path="/endpoints/:id/edit" element={<EndpointFormPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/claude" element={<ClaudePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
