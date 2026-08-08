/**
 * Shared WalletConnect configuration.
 * Single modal instance used by both EVM and Tron wallet contexts
 * to avoid DOM conflicts from multiple modal instances.
 */
import { WalletConnectModal } from "@walletconnect/modal";

export const WALLETCONNECT_PROJECT_ID = "df862038a8e2401c6bda0f2900613d21";

// Single shared modal instance — prevents conflicts from dual modals
export const walletConnectModal = new WalletConnectModal({
  projectId: WALLETCONNECT_PROJECT_ID,
  themeMode: "dark",
});
