import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ensPayTo } from "@/lib/ens";

export type EnsCheck =
  | { state: "checking" }
  /** Resolves to the expected payout address. */
  | { state: "verified"; address: string }
  /** Registered by the gateway but not resolving yet (transactions still mining). */
  | { state: "pending" }
  /** Resolves somewhere else: don't pay. */
  | { state: "mismatch"; address: string };

/** Resolves `name` on Sepolia and compares it with the address payments should go to. */
export function useEnsCheck(name: string | null | undefined, expected: string | null | undefined): EnsCheck | null {
  const q = useQuery({
    queryKey: ["ens", name],
    queryFn: () => ensPayTo(name!),
    enabled: !!name,
    staleTime: 60_000,
    // a freshly registered name resolves a block or two later
    refetchInterval: (query) => (query.state.data === null ? 15_000 : false),
  });
  if (!name) return null;
  if (q.isPending) return { state: "checking" };
  const addr = q.data ?? null;
  if (!addr) return { state: "pending" };
  if (expected && addr !== expected.toLowerCase()) return { state: "mismatch", address: addr };
  return { state: "verified", address: addr };
}

/** The signed-in seller's profile: their ENS name and whether the gateway names things on ENS. */
export function useMe() {
  const { address, status } = useSession();
  return useQuery({
    queryKey: ["me-profile", address],
    queryFn: api.me,
    enabled: status === "signed-in",
    staleTime: 30_000,
  });
}

export function useClaimName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.claimName,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-profile"] }),
  });
}
