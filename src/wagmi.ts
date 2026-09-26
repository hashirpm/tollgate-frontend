import { createConfig, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { APP_NAME, CHAIN } from "./lib/config";

// Base Sepolia only. `injected` also surfaces EIP-6963 wallets (MetaMask,
// Rabby, ...); Coinbase Wallet covers the Base-native smart wallet. Neither
// needs a WalletConnect project id.
export const config = createConfig({
  chains: [CHAIN],
  connectors: [injected(), coinbaseWallet({ appName: APP_NAME })],
  transports: { [CHAIN.id]: http() },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
