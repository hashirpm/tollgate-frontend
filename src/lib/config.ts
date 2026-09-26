import { baseSepolia } from "wagmi/chains";

export const APP_NAME = "Tollgate";

/** The only chain we settle on. */
export const CHAIN = baseSepolia;

/** Circle's USDC on Base Sepolia (6 decimals). */
export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const USDC_DECIMALS = 6;

export const BASESCAN = "https://sepolia.basescan.org";
export const USDC_FAUCET = "https://faucet.circle.com/";

/**
 * How buyers launch the MCP server. The package isn't published yet, so this
 * is configurable: set NEXT_PUBLIC_MCP_COMMAND (e.g. "npx -y x402-mcp") at build time.
 */
export const MCP_COMMAND: string | undefined = process.env.NEXT_PUBLIC_MCP_COMMAND || undefined;
export const MCP_SERVER_NAME = "tollgate";

/** The hosted MCP server (Streamable HTTP, OAuth). Override with NEXT_PUBLIC_MCP_URL at build time. */
export const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL || "https://x402-gateway-mcp.tollgate-tokyo.workers.dev/mcp";

/**
 * Opens claude.ai's "Add custom connector" dialog. The mcpName / mcpServerUrl
 * prefill params aren't in Anthropic's docs (see anthropics/claude-ai-mcp#74),
 * so the UI next to this link always offers the URL to paste as well.
 */
export const CLAUDE_CONNECTOR_LINK = `https://claude.ai/settings/connectors?${new URLSearchParams({
  modal: "add-custom-connector",
  mcpName: APP_NAME,
  mcpServerUrl: MCP_URL,
})}`;

export const CLAUDE_CODE_ADD = `claude mcp add --transport http ${MCP_SERVER_NAME} ${MCP_URL}`;
