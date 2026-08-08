/**
 * Shared WalletConnect configuration.
 * Single modal instance used by both EVM and Tron wallet contexts
 * to avoid DOM conflicts from multiple modal instances.
 */
import { WalletConnectModal } from "@walletconnect/modal";

export const WALLETCONNECT_PROJECT_ID = "df862038a8e2401c6bda0f2900613d21";

const WC_Z_INDEX = "2147483647";

// Single shared modal instance — prevents conflicts from dual modals
export const walletConnectModal = new WalletConnectModal({
  projectId: WALLETCONNECT_PROJECT_ID,
  themeMode: "dark",
});

function applyWalletConnectModalLayering(isOpen: boolean) {
  const modal = document.querySelector("wcm-modal") as HTMLElement | null;
  if (!modal) return;

  modal.style.setProperty("--wcm-z-index", WC_Z_INDEX);
  modal.style.setProperty("position", "fixed");
  modal.style.setProperty("z-index", WC_Z_INDEX);
  modal.style.setProperty("top", "0");
  modal.style.setProperty("left", "0");
  modal.style.setProperty("overflow", "visible");

  if (isOpen) {
    modal.style.setProperty("width", "100%");
    modal.style.setProperty("height", "100%");
    modal.style.setProperty("pointer-events", "auto");
  } else {
    // Closed: do not cover the page or block Obtain / other UI clicks
    modal.style.setProperty("width", "0");
    modal.style.setProperty("height", "0");
    modal.style.setProperty("pointer-events", "none");
  }
}

if (typeof document !== "undefined") {
  walletConnectModal.subscribeModal((state) => {
    requestAnimationFrame(() => applyWalletConnectModalLayering(state.open));
  });

  new MutationObserver(() => {
    if (document.querySelector("wcm-modal")) {
      applyWalletConnectModalLayering(false);
    }
  }).observe(document.body, { childList: true });
}
