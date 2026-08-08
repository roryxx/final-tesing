/**
 * Singleton WalletConnect v2 UniversalProvider.
 * One provider + one session with eip155 + tron namespaces avoids
 * dual-provider modal conflicts that block the Tron connect popup.
 */
import { UniversalProvider } from "@walletconnect/universal-provider";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import { TRON_CHAIN_ID } from "@/lib/tronConfig";
import { WALLETCONNECT_PROJECT_ID, walletConnectModal } from "@/lib/walletConnect";

const ALL_WC_CHAINS = SUPPORTED_CHAINS.map((c) => c.wcChainId);

const EVM_METHODS = [
  "eth_sendTransaction",
  "personal_sign",
  "eth_signTransaction",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
];

const TRON_METHODS = ["tron_signTransaction", "tron_signMessage"];

const MULTI_CHAIN_NAMESPACES = {
  optionalNamespaces: {
    eip155: {
      chains: ALL_WC_CHAINS,
      methods: EVM_METHODS,
      events: ["chainChanged", "accountsChanged"],
    },
    tron: {
      chains: [TRON_CHAIN_ID],
      methods: TRON_METHODS,
      events: [],
    },
  },
};

let provider: InstanceType<typeof UniversalProvider> | null = null;
let initPromise: Promise<InstanceType<typeof UniversalProvider>> | null = null;
let displayUriHandler: ((uri: string) => void) | null = null;
let connecting = false;

export function extractEvmAddress(session: any): string | null {
  try {
    const accounts = session?.namespaces?.eip155?.accounts as string[] | undefined;
    if (!accounts?.length) return null;
    const parts = accounts[0].split(":");
    return parts.length >= 3 ? parts.slice(2).join(":") : null;
  } catch {
    return null;
  }
}

export function extractTronAddress(session: any): string | null {
  try {
    const accounts = session?.namespaces?.tron?.accounts as string[] | undefined;
    if (!accounts?.length) return null;
    return accounts[0].split(":")[2] || null;
  } catch {
    return null;
  }
}

function setupUriHandler(universalProvider: InstanceType<typeof UniversalProvider>) {
  if (displayUriHandler) {
    try {
      universalProvider.off("display_uri", displayUriHandler);
    } catch {
      /* ignore */
    }
  }

  displayUriHandler = (uri: string) => {
    walletConnectModal.closeModal();
    setTimeout(() => {
      walletConnectModal.openModal({ uri });
    }, 300);
  };

  universalProvider.on("display_uri", displayUriHandler);
}

export async function getWalletConnectProvider(): Promise<InstanceType<typeof UniversalProvider>> {
  if (provider) return provider;
  if (initPromise) return initPromise;

  initPromise = UniversalProvider.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    relayUrl: "wss://relay.walletconnect.com",
    metadata: {
      name: "Escrow v3",
      description: "Multi-Chain Web3 Escrow",
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`],
    },
  });

  provider = await initPromise;
  return provider;
}

export async function connectMultiChainWallet(): Promise<{
  evmAddress: string | null;
  tronAddress: string | null;
  session: any;
}> {
  if (connecting) {
    throw new Error("Connection already in progress");
  }

  connecting = true;

  try {
    const universalProvider = await getWalletConnectProvider();

    if (universalProvider.session) {
      const session = universalProvider.session;
      walletConnectModal.closeModal();
      return {
        evmAddress: extractEvmAddress(session),
        tronAddress: extractTronAddress(session),
        session,
      };
    }

    setupUriHandler(universalProvider);

    const session = await universalProvider.connect(MULTI_CHAIN_NAMESPACES);
    walletConnectModal.closeModal();

    return {
      evmAddress: extractEvmAddress(session),
      tronAddress: extractTronAddress(session),
      session,
    };
  } finally {
    connecting = false;
  }
}

export async function connectTronWallet(): Promise<{
  evmAddress: string | null;
  tronAddress: string | null;
  session: any;
}> {
  if (connecting) {
    throw new Error("Connection already in progress");
  }

  connecting = true;

  try {
    const universalProvider = await getWalletConnectProvider();
    const existingSession = universalProvider.session;

    if (existingSession) {
      const existingTron = extractTronAddress(existingSession);
      if (existingTron) {
        walletConnectModal.closeModal();
        return {
          evmAddress: extractEvmAddress(existingSession),
          tronAddress: existingTron,
          session: existingSession,
        };
      }

      // Re-pair with both namespaces so EVM session is preserved when possible.
      try {
        await universalProvider.disconnect();
      } catch {
        /* ignore */
      }
      provider = null;
      initPromise = null;
    }

    const freshProvider = await getWalletConnectProvider();
    setupUriHandler(freshProvider);

    walletConnectModal.closeModal();
    await new Promise((resolve) => setTimeout(resolve, 400));

    const session = await freshProvider.connect(MULTI_CHAIN_NAMESPACES);
    walletConnectModal.closeModal();

    return {
      evmAddress: extractEvmAddress(session),
      tronAddress: extractTronAddress(session),
      session,
    };
  } finally {
    connecting = false;
  }
}

export async function disconnectWalletConnect(): Promise<void> {
  try {
    walletConnectModal.closeModal();
    if (provider?.session) {
      await provider.disconnect();
    }
  } catch {
    /* ignore */
  } finally {
    if (provider && displayUriHandler) {
      try {
        provider.off("display_uri", displayUriHandler);
      } catch {
        /* ignore */
      }
    }
    provider = null;
    initPromise = null;
    displayUriHandler = null;
    connecting = false;
  }
}

export function getActiveSession(): any {
  return provider?.session ?? null;
}

export function getActiveProvider(): InstanceType<typeof UniversalProvider> | null {
  return provider;
}

export function isWalletConnecting(): boolean {
  return connecting;
}
