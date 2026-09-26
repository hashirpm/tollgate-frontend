// Sign-In With Ethereum against the Worker:
//   GET /api/auth/nonce → build SIWE message → wallet signs → POST /api/auth/verify → { token }
// The token is stored per address (see session.ts) and sent as a bearer token.

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { api, ApiError } from "./api";
import { APP_NAME, CHAIN } from "./config";
import { clearToken, setToken, useToken } from "./session";

export type SessionStatus =
  | "reconnecting" // wagmi is restoring a previous connection
  | "disconnected"
  | "wrong-chain"
  | "signed-out" // connected on the right chain, no token
  | "checking" // have a token, confirming it with /api/me
  | "signed-in";

export function useSession() {
  const { address, chainId, status: wallet } = useAccount();
  const token = useToken(address);
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Confirm a stored token once per address on load. A 401 clears it (api.ts).
  const me = useQuery({
    queryKey: ["me", address, token],
    queryFn: api.me,
    enabled: !!token && !!address && chainId === CHAIN.id,
    staleTime: Infinity,
    retry: (n, e) => !(e instanceof ApiError && e.status === 401) && n < 2,
  });

  const signIn = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect a wallet first");
      const nonce = await api.nonce();
      const message = createSiweMessage({
        address,
        chainId: CHAIN.id,
        // The gateway checks this against its own host until it honors
        // x-forwarded-host, so dev against a remote gateway signs for that host.
        domain: process.env.NEXT_PUBLIC_SIWE_DOMAIN || location.host,
        uri: location.origin,
        nonce,
        version: "1",
        statement: `Sign in to ${APP_NAME}`,
        issuedAt: new Date(),
      });
      const signature = await signMessageAsync({ message });
      const t = await api.verify(message, signature);
      setToken(address, t);
      return t;
    },
  });

  let status: SessionStatus;
  if (wallet === "reconnecting" || wallet === "connecting") status = "reconnecting";
  else if (wallet !== "connected" || !address) status = "disconnected";
  else if (chainId !== CHAIN.id) status = "wrong-chain";
  else if (!token) status = "signed-out";
  else if (me.isPending) status = "checking";
  else status = "signed-in";

  return {
    status,
    address,
    signIn: signIn.mutate,
    signingIn: signIn.isPending,
    signInError: signIn.error,
    signOut: () => {
      clearToken(address);
      disconnect();
    },
  };
}

/**
 * Mounted once at the root. Drops the session when the account or chain
 * changes under us (the plan: any account/chain change means sign in again).
 */
export function SessionWatcher() {
  const { address, chainId, status } = useAccount();
  const prev = useRef<{ address?: string; chainId?: number }>({});

  useEffect(() => {
    if (status !== "connected" || !address) return;
    const p = prev.current;
    if (p.address && p.address.toLowerCase() !== address.toLowerCase()) clearToken(p.address);
    if (p.chainId !== undefined && p.chainId !== chainId) clearToken(address);
    if (chainId !== CHAIN.id) clearToken(address);
    prev.current = { address, chainId };
  }, [address, chainId, status]);

  return null;
}
