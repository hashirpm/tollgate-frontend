import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Range = "24h" | "30d";

export function useStats(range: Range, endpointId?: string) {
  return useQuery({
    queryKey: ["stats", range, endpointId ?? "all"],
    queryFn: () => api.stats(range, endpointId),
    refetchInterval: 5_000,
    placeholderData: (prev) => prev,
  });
}
