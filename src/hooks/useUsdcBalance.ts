import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { CHAIN, USDC_ADDRESS } from "@/lib/config";

/** The seller's USDC balance on Base Sepolia, refreshed every 10s. Atomic units. */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN.id,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}
