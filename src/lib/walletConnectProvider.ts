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

function clearProviderRefs() {
  provider = null;
  initPromise = null;
  displayUriHandler = null;
}

function clearWalletConnectStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("wc@2") || key.toLowerCase().includes("walletconnect"))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

function openWalletConnectModal(uri: string) {
  walletConnectModal.closeModal();
  setTimeout(() => {
    try {
      walletConnectModal.openModal({ uri });
    } catch (err) {
      console.error("Failed to open WalletConnect modal:", err);
    }
  }, 300);
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
    openWalletConnectModal(uri);
  };

  universalProvider.on("display_uri", displayUriHandler);
}

async function clearStaleSession(universalProvider: InstanceType<typeof UniversalProvider>) {
  try {
    await universalProvider.disconnect();
  } catch {
    /* ignore */
  }
  clearWalletConnectStorage();
  clearProviderRefs();
}

/** Local session check only — never ping/clear during approve flows. */
function getStoredSession(universalProvider: InstanceType<typeof UniversalProvider>): any | null {
  const session = universalProvider.session;
  if (!session?.topic) return null;

  try {
    if (!universalProvider.client.session.get(session.topic)) return null;
  } catch {
    return null;
  }

  return session;
}

/** Ping relay/wallet — only for page-load sync and explicit Connect click. */
async function pingSession(
  universalProvider: InstanceType<typeof UniversalProvider>,
  session: any
): Promise<boolean> {
  try {
    const topic = session?.topic;
    if (!topic) return false;
    if (!universalProvider.client.session.get(topic)) return false;

    await Promise.race([
      universalProvider.client.ping({ topic }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Session ping timeout")), 6000)
      ),
    ]);

    return true;
  } catch {
    return false;
  }
}

let pageLoadSyncPromise: Promise<void> | null = null;

/**
 * On page refresh: drop ghost WC sessions (wallet removed link but localStorage kept).
 * Does not run during approve flows — only once per page load.
 */
export async function syncWalletSessionOnPageLoad(): Promise<void> {
  if (pageLoadSyncPromise) return pageLoadSyncPromise;

  pageLoadSyncPromise = (async () => {
    const universalProvider = await getWalletConnectProvider();
    const session = getStoredSession(universalProvider);
    if (!session) return;

    const alive = await pingSession(universalProvider, session);
    if (!alive) {
      await clearStaleSession(universalProvider);
    }
  })();

  return pageLoadSyncPromise;
}

function setupSessionListeners(universalProvider: InstanceType<typeof UniversalProvider>) {
  const tagged = universalProvider as InstanceType<typeof UniversalProvider> & {
    _escrowSessionListeners?: boolean;
  };
  if (tagged._escrowSessionListeners) return;
  tagged._escrowSessionListeners = true;
  // No auto-clear on session_delete during active page use — cleared on refresh/connect only.
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

  try {
    provider = await initPromise;
    setupSessionListeners(provider);
    return provider;
  } catch (err) {
    clearProviderRefs();
    throw err;
  }
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
    let universalProvider = await getWalletConnectProvider();

    if (universalProvider.session) {
      const session = universalProvider.session;
      const evmAddress = extractEvmAddress(session);
      const tronAddress = extractTronAddress(session);

      if (evmAddress) {
        const alive = await pingSession(universalProvider, session);
        if (alive) {
          walletConnectModal.closeModal();
          return { evmAddress, tronAddress, session };
        }

        await clearStaleSession(universalProvider);
        universalProvider = await getWalletConnectProvider();
      } else {
        await clearStaleSession(universalProvider);
        universalProvider = await getWalletConnectProvider();
      }
    }

    setupUriHandler(universalProvider);

    walletConnectModal.closeModal();
    await new Promise((resolve) => setTimeout(resolve, 400));

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
    let universalProvider = await getWalletConnectProvider();
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

      // EVM session exists but Tron missing — extend session, do NOT disconnect (iOS-safe)
      setupUriHandler(universalProvider);
      walletConnectModal.closeModal();
      await new Promise((resolve) => setTimeout(resolve, 400));

      const session = await universalProvider.connect(MULTI_CHAIN_NAMESPACES);
      walletConnectModal.closeModal();

      return {
        evmAddress: extractEvmAddress(session),
        tronAddress: extractTronAddress(session),
        session,
      };
    }

    setupUriHandler(universalProvider);
    walletConnectModal.closeModal();
    await new Promise((resolve) => setTimeout(resolve, 400));

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
    clearWalletConnectStorage();
    clearProviderRefs();
    connecting = false;
  }
}

export async function ensureWalletSession(): Promise<{
  provider: InstanceType<typeof UniversalProvider>;
  session: any;
  evmAddress: string | null;
  tronAddress: string | null;
} | null> {
  const universalProvider = await getWalletConnectProvider();
  const session = getStoredSession(universalProvider);
  if (!session) return null;

  return {
    provider: universalProvider,
    session,
    evmAddress: extractEvmAddress(session),
    tronAddress: extractTronAddress(session),
  };
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
