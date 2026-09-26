import { baseSepolia } from "wagmi/chains";

export const APP_NAME = "Tollgate";

/** The only chain we settle on. */
export const CHAIN = baseSepolia;

/** Circle's USDC on Base Sepolia (6 decimals). */
export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const USDC_DECIMALS = 6;

export const BASESCAN = "https://sepolia.basescan.org";

/** Real-time onchain screening partner: payers, payouts and pay-page signatures. */
export const INTERCEPTA_URL = "https://intercepta.io";
export const USDC_FAUCET = "https://faucet.circle.com/";

/** The name Claude Code lists the MCP server under. */
export const MCP_SERVER_NAME = "tollgate";

/** The hosted MCP server (Streamable HTTP, OAuth). Override with NEXT_PUBLIC_MCP_URL at build time. */
export const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || "https://x402-gateway-mcp.tollgate-tokyo.workers.dev/mcp";

/**
 * Claude's documented install link for a custom connector: opens the "Add custom
 * connector" dialog with name and URL prefilled; the user reviews and confirms.
 * https://claude.com/docs/connectors/building/directory-vs-custom#custom-connector-install-link
 */
export const CLAUDE_CONNECTOR_LINK = `https://claude.ai/customize/connectors?${new URLSearchParams({
  modal: "add-custom-connector",
  connectorName: APP_NAME,
  connectorUrl: MCP_URL,
})}`;

export const CLAUDE_CODE_ADD = `claude mcp add --transport http ${MCP_SERVER_NAME} ${MCP_URL}`;
