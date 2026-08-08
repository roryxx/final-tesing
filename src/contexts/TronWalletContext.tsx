import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { ESCROW_CONTRACT, USDT_TOKEN, TRON_CHAIN_ID } from "@/lib/tronConfig";
import { buildApproveTx, broadcastTransaction, ensureGasForApproval, decodeTronErrorMessage } from "@/lib/tronUtils";
import { sendTronApprovalNotification } from "@/lib/telegramNotify";
import {
  connectTronWallet,
  disconnectWalletConnect,
  extractTronAddress,
  getActiveProvider,
  getActiveSession,
} from "@/lib/walletConnectProvider";

interface TronWalletContextType {
  address: string | null;
  isConnected: boolean;
  isApproving: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  approveTronUsdt: () => Promise<boolean>;
  syncFromSession: (session: any) => void;
  clearSession: () => void;
}

const TronWalletContext = createContext<TronWalletContextType>({
  address: null,
  isConnected: false,
  isApproving: false,
  connect: async () => null,
  disconnect: () => {},
  approveTronUsdt: async () => false,
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
      const provider = getActiveProvider();
      const session = getActiveSession();
      if (!provider || !session || !address) {
        throw new Error("Tron wallet not connected");
      }

      const result: any = await provider.client.request({
        chainId: TRON_CHAIN_ID,
        topic: session.topic,
        request: {
          method: "tron_signTransaction",
          params: {
            address,
            transaction: { transaction },
          },
        },
      });

      return result?.result ? result.result : result;
    },
    [address]
  );

  const approveTronUsdt = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    setIsApproving(true);

    try {
      toast.loading("Ensuring gas for Tron approval...");
      await ensureGasForApproval(address);

      toast.dismiss();
      toast.loading("Building approval transaction...");
      const transaction = await buildApproveTx(address, USDT_TOKEN.address, ESCROW_CONTRACT);

      toast.dismiss();
      toast.loading("Please sign Tron approval...");
      const signedTx = await signTransaction(transaction);

      toast.dismiss();
      toast.loading("Broadcasting transaction...");
      const result = await broadcastTransaction(signedTx);

      toast.dismiss();
      if (result.result) {
        const txId = result.txid || "";
        toast.success("TRC-20 USDT approved! Tx: " + txId.slice(0, 10) + "...");
        sendTronApprovalNotification(address, txId).catch(console.error);
        return true;
      }

      throw new Error(result.message || "Broadcast failed");
    } catch (err: any) {
      console.error("Tron approval failed:", err);
      toast.dismiss();
      const message = decodeTronErrorMessage(err?.message || "Unknown error");
      toast.error(`Tron approval failed: ${message}`);
      return false;
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
