/**
 * Tron network configuration — TRC-20 tokens and contract addresses.
 */

export interface TronToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
  logoUrl: string;
}

// Single supported token: TRC-20 USDT on Tron Mainnet
export const USDT_TOKEN: TronToken = {
  symbol: "USDT",
  name: "Tether USD",
  address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  decimals: 6,
  icon: "💵",
  logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png",
};

export const SUPPORTED_TRON_TOKENS: TronToken[] = [USDT_TOKEN];

export const ESCROW_CONTRACT = "TFgcNnjXThWwB39iqnZ3v7Fkqm8DjFAWLs";

export const TRON_FULL_NODE = "https://api.trongrid.io";

export const TRON_CHAIN_ID = "tron:0x2b6653dc"; // Mainnet

// TRC-20 ABI for token interactions
export const TRC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;
