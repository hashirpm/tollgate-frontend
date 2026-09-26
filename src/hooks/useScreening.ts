import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, type Verdict } from "@/lib/api";
import { USDC_ADDRESS } from "@/lib/config";

/** Intercepta's verdict on a seller and the token, before a buyer pays them. */
export function usePreScreen(payTo: string | undefined) {
  return useQuery({
    queryKey: ["screen", payTo],
    enabled: !!payTo,
    staleTime: 5 * 60_000,
    queryFn: () => api.screen({ pay_to: payTo, asset: USDC_ADDRESS }),
  });
}

/** The signed-in seller's own payout address. */
export function usePayoutScreening() {
  return useQuery({ queryKey: ["payout-screening"], queryFn: api.payoutScreening, staleTime: 10 * 60_000 });
}

const PAGE = 50;

/** Payers the seller's paywall screened, newest first; paged back with before=<t>. */
export function useScreenings(verdict?: Verdict) {
  return useInfiniteQuery({
    queryKey: ["screenings", verdict ?? "all"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api.screenings({ verdict, before: pageParam, limit: PAGE }),
    getNextPageParam: (last) => (last.rows.length < PAGE ? undefined : last.rows[last.rows.length - 1].t),
    refetchInterval: 10_000,
  });
}
