import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Range } from "./useStats";

/** Recorded vs onchain income, from the gateway's MultiBaas reconciliation. */
export function useReconcile(range: Range = "24h") {
  return useQuery({
    queryKey: ["reconcile", range],
    queryFn: () => api.reconcile(range),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

/** What the seller should do next, most urgent first. */
export function useActions() {
  return useQuery({ queryKey: ["actions"], queryFn: api.actions, refetchInterval: 15_000 });
}
