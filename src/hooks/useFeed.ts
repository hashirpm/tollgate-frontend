import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Call, type CallStatus } from "@/lib/api";

export type FeedRow = Call & { fresh: boolean };

/**
 * Live feed: loads the latest `limit` calls once, then polls
 * GET /api/feed?since=<newest cursor> every 2s and prepends whatever is new.
 * Rows that arrived after the first load carry `fresh: true` so the list can
 * flash them on mount.
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
      const since = current[0]?.cursor;
      const incoming = await api.feed({ endpoint_id: endpointId, since, limit });
      const known = new Set(current.map((r) => r.id));
      const added = incoming.filter((r) => !known.has(r.id));
      if (!added.length) return current;

      // new paid calls move the KPIs and per-endpoint totals
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["endpoints"] });
      return [...added.map((r) => ({ ...r, fresh: true })), ...current].sort((a, b) => b.t - a.t).slice(0, limit);
    },
  });

  return { ...query, rows: query.data ?? [] };
}

const PAGE = 50;

/** Full history for the Payments page, paged backwards with before=<cursor>. */
export function usePayments(filters: { endpointId?: string; status?: CallStatus }) {
  return useInfiniteQuery({
    queryKey: ["payments", filters.endpointId ?? "all", filters.status ?? "all"],
    initialPageParam: undefined as string | number | undefined,
    queryFn: ({ pageParam }) =>
      api.feed({ before: pageParam, endpoint_id: filters.endpointId, status: filters.status, limit: PAGE }),
    getNextPageParam: (last) => (last.length < PAGE ? undefined : last[last.length - 1].cursor),
  });
}
