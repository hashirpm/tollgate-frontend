import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN } from "./lib/config";

// Base Sepolia only. `injected` also surfaces every EIP-6963 browser wallet
// (MetaMask, Rabby, ...) by name. No WalletConnect project id needed.
export const config = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: { [CHAIN.id]: http() },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
