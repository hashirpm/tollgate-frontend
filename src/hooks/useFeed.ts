import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Call, type CallStatus } from "@/lib/api";

export type FeedRow = Call & { fresh: boolean };

/**
 * Live feed: polls the latest `limit` calls every 2s. Rows that arrived after
 * the first load carry `fresh: true` so the list can flash them on mount. The
 * whole page is refetched, not just newer rows, because a row's onchain
 * verification changes after it first appears (confirming → verified).
 */
export function useFeed({ endpointId, limit = 20 }: { endpointId?: string; limit?: number } = {}) {
  const qc = useQueryClient();
  const queryKey = ["feed", endpointId ?? "all", limit];

  const query = useQuery({
    queryKey,
    refetchInterval: 2_000,
    queryFn: async (): Promise<FeedRow[]> => {
      const current = qc.getQueryData<FeedRow[]>(queryKey);
      if (!current) {
        const first = await api.feed({ endpoint_id: endpointId, limit });
        return first.map((r) => ({ ...r, fresh: false }));
      }
      const incoming = await api.feed({ endpoint_id: endpointId, limit });
      const known = new Map(current.map((r) => [r.id, r]));
      if (incoming.some((r) => !known.has(r.id))) {
        // new paid calls move the KPIs, per-endpoint totals and the reconciliation
        qc.invalidateQueries({ queryKey: ["stats"] });
        qc.invalidateQueries({ queryKey: ["endpoints"] });
        qc.invalidateQueries({ queryKey: ["reconcile"] });
        qc.invalidateQueries({ queryKey: ["actions"] });
      }
      return incoming.map((r) => ({ ...r, fresh: known.get(r.id)?.fresh ?? true }));
    },
  });

  return { ...query, rows: query.data ?? [] };
}

const PAGE = 50;

/** Full history for the Payments page, paged backwards with before=<cursor>. */
export function usePayments(filters: { endpointId?: string; status?: CallStatus; unverified?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["payments", filters.endpointId ?? "all", filters.status ?? "all", filters.unverified ? "unverified" : "any"],
    initialPageParam: undefined as string | number | undefined,
    queryFn: ({ pageParam }) =>
      api.feed({
        before: pageParam,
        endpoint_id: filters.endpointId,
        status: filters.status,
        verification: filters.unverified ? "unverified" : undefined,
        limit: PAGE,
      }),
    getNextPageParam: (last) => (last.length < PAGE ? undefined : last[last.length - 1].cursor),
  });
}
