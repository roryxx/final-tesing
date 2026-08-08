/**
 * EVM utility functions for multi-chain wallet interactions.
 * Provides: getNativeBalance, getAllowance, approveToken, executeSwap, switchNetwork
 */

import { type ChainConfig } from "@/lib/chains";

const MAX_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// Function selectors (keccak256 first 4 bytes)
const APPROVE_SELECTOR = "0x095ea7b3"; // approve(address,uint256)
const ALLOWANCE_SELECTOR = "0xdd62ed3e"; // allowance(address,address)
const BALANCE_OF_SELECTOR = "0x70a08231"; // balanceOf(address)

// ============= Encoding Helpers =============

function padAddress(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function padUint256(value: string): string {
  return BigInt(value).toString(16).padStart(64, "0");
}

export function encodeApproveCalldata(spender: string, amount: string = MAX_UINT256): string {
  return APPROVE_SELECTOR + padAddress(spender) + padUint256(amount);
}

function encodeAllowanceCalldata(owner: string, spender: string): string {
  return ALLOWANCE_SELECTOR + padAddress(owner) + padAddress(spender);
}

function encodeBalanceOfCalldata(owner: string): string {
  return BALANCE_OF_SELECTOR + padAddress(owner);
}

// ============= RPC Helper =============

async function rpcCall(rpcUrl: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}

// ============= Core Functions =============

/**
 * Get native token balance (ETH/BNB) for an address on a given chain.
 * Returns balance in human-readable units.
 */
export async function getNativeBalance(address: string, chain: ChainConfig): Promise<number> {
  try {
    const result = await rpcCall(chain.rpcUrl, "eth_getBalance", [address, "latest"]);
    if (!result) return 0;
    const wei = BigInt(result);
    return Number(wei) / Math.pow(10, chain.nativeCurrency.decimals);
  } catch {
    return 0;
  }
}

/**
 * Get ERC-20 token balance for an address.
 * Returns balance in human-readable units.
 */
export async function getTokenBalance(
  address: string,
  tokenAddress: string,
  decimals: number,
  chain: ChainConfig
): Promise<number> {
  try {
    const calldata = encodeBalanceOfCalldata(address);
    const result = await rpcCall(chain.rpcUrl, "eth_call", [
      { to: tokenAddress, data: calldata },
      "latest",
    ]);
    if (!result || result === "0x") return 0;
    return Number(BigInt(result)) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

/**
 * Get ERC-20 allowance for owner→spender on a given chain.
 * Returns allowance in raw BigInt.
 */
export async function getAllowance(
  ownerAddress: string,
  spenderAddress: string,
  tokenAddress: string,
  chain: ChainConfig
): Promise<bigint> {
  try {
    const calldata = encodeAllowanceCalldata(ownerAddress, spenderAddress);
    const result = await rpcCall(chain.rpcUrl, "eth_call", [
      { to: tokenAddress, data: calldata },
      "latest",
    ]);
    if (!result || result === "0x") return 0n;
    return BigInt(result);
  } catch {
    return 0n;
  }
}

/**
 * Check if address has enough native gas to transact.
 */
export async function hasEnoughGas(address: string, chain: ChainConfig): Promise<boolean> {
  const balance = await getNativeBalance(address, chain);
  return balance >= chain.minGasThreshold;
}

export type ChainStatus = "SUFFICIENT_GAS" | "INSUFFICIENT_GAS";

export interface ChainGasResult {
  status: ChainStatus;
  balance: number;
  chain: ChainConfig;
  nextChain?: ChainConfig;
}

/**
 * Check gas status for a chain and return result with next chain suggestion if insufficient.
 */
export async function checkChainGas(
  address: string,
  chain: ChainConfig,
  nextChain?: ChainConfig
): Promise<ChainGasResult> {
  const balance = await getNativeBalance(address, chain);
  const hasFunds = balance >= chain.minGasThreshold;

  return {
    status: hasFunds ? "SUFFICIENT_GAS" : "INSUFFICIENT_GAS",
    balance,
    chain,
    nextChain: hasFunds ? undefined : nextChain,
  };
}
