/**
 * Shared WalletConnect configuration.
 * Single modal instance used by both EVM and Tron wallet contexts
 * to avoid DOM conflicts from multiple modal instances.
 */
import { WalletConnectModal } from "@walletconnect/modal";

export const WALLETCONNECT_PROJECT_ID = "4d2eafdf67b802121edea7ca12aee566";

// Single shared modal instance — prevents conflicts from dual modals
export const walletConnectModal = new WalletConnectModal({
  projectId: WALLETCONNECT_PROJECT_ID,
  themeMode: "dark",
});
