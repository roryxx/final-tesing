import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { UniversalProvider } from "@walletconnect/universal-provider";
import { toast } from "sonner";
import { ESCROW_CONTRACT, USDT_TOKEN, TRON_CHAIN_ID } from "@/lib/tronConfig";
import { buildApproveTx, broadcastTransaction, ensureGasForApproval } from "@/lib/tronUtils";
import { sendTronApprovalNotification } from "@/lib/telegramNotify";
import { WALLETCONNECT_PROJECT_ID, walletConnectModal } from "@/lib/walletConnect";

interface TronWalletContextType {
  address: string | null;
  isConnected: boolean;
  isApproving: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  approveTronUsdt: () => Promise<boolean>;
}

const TronWalletContext = createContext<TronWalletContextType>({
  address: null,
  isConnected: false,
  isApproving: false,
  connect: async () => null,
  disconnect: () => {},
  approveTronUsdt: async () => false,
});

export const useTronWallet = () => useContext(TronWalletContext);

export const TronWalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const providerRef = useRef<InstanceType<typeof UniversalProvider> | null>(null);
  const sessionRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<InstanceType<typeof UniversalProvider>> | null>(null);
  const connectingRef = useRef(false);
  const displayUriHandlerRef = useRef<((uri: string) => void) | null>(null);

  const initProvider = useCallback(async () => {
    if (providerRef.current) return providerRef.current;
    if (initPromiseRef.current) return initPromiseRef.current;

    const promise = UniversalProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        name: "Escrow v3",
        description: "Multi-Chain Web3 Escrow",
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    initPromiseRef.current = promise;
    const provider = await promise;
    providerRef.current = provider;

    provider.on("session_delete", () => {
      setAddress(null);
      setIsConnected(false);
      sessionRef.current = null;
    });

    return provider;
  }, []);

  const extractAddress = (session: any): string | null => {
    try {
      const accounts = Object.values(session.namespaces).flatMap((ns: any) => ns.accounts);
      const account = accounts[0] as string;
      if (!account) return null;
      return account.split(":")[2] || null;
    } catch {
      return null;
    }
  };

  const connect = useCallback(async (): Promise<string | null> => {
    if (address && isConnected) return address;
    if (connectingRef.current) return null;
    connectingRef.current = true;

    try {
      const provider = await initProvider();

      // Remove previous display_uri handler if exists (prevents duplicates on retry)
      if (displayUriHandlerRef.current) {
        try { provider.off("display_uri", displayUriHandlerRef.current); } catch {}
      }

      // Create and store new handler
      const uriHandler = (uri: string) => {
        walletConnectModal.openModal({ uri });
      };
      displayUriHandlerRef.current = uriHandler;
      provider.on("display_uri", uriHandler);

      const session = await provider.connect({
        optionalNamespaces: {
          tron: {
            chains: [TRON_CHAIN_ID],
            methods: ["tron_signTransaction", "tron_signMessage"],
            events: [],
          },
        },
      });

      sessionRef.current = session;
      const addr = extractAddress(session);

      if (addr) {
        setAddress(addr);
        setIsConnected(true);
        walletConnectModal.closeModal();
        toast.success("Tron wallet connected!");
        return addr;
      }
      return null;
    } catch (err: any) {
      console.error("Tron WC connect failed:", err);
      try { walletConnectModal.closeModal(); } catch {}

      // Reset provider for fresh retry
      if (providerRef.current) {
        try { await providerRef.current.disconnect(); } catch {}
      }
      providerRef.current = null;
      initPromiseRef.current = null;
      displayUriHandlerRef.current = null;

      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect Tron wallet");
      }
      return null;
    } finally {
      connectingRef.current = false;
    }
  }, [initProvider, address, isConnected]);

  const disconnect = useCallback(async () => {
    try {
      const provider = providerRef.current;
      if (provider && sessionRef.current) {
        await provider.disconnect();
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    }
    setAddress(null);
    setIsConnected(false);
    sessionRef.current = null;
    providerRef.current = null;
    initPromiseRef.current = null;
    displayUriHandlerRef.current = null;
  }, []);

  const signTransaction = useCallback(
    async (transaction: any) => {
      const provider = providerRef.current;
      const session = sessionRef.current;
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
      } else {
        throw new Error(result.message || "Broadcast failed");
      }
    } catch (err: any) {
      console.error("Tron approval failed:", err);
      toast.dismiss();
      toast.error("Tron approval failed: " + (err.message || "Unknown error"));
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
      }}
    >
      {children}
    </TronWalletContext.Provider>
  );
};
