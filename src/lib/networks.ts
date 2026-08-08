import type { NetworkKey } from "@/contexts/UnifiedWalletContext";

export interface NetworkItem {
  id: NetworkKey;
  title: string;
  subtitle: string;
  logo: string;
  accentColor: string;
  accentBg: string;
  tokens: string[];
}

export const NETWORKS: NetworkItem[] = [
  {
    id: "trc20",
    title: "TRC-20",
    subtitle: "Tron Network",
    logo: "https://cryptologos.cc/logos/tron-trx-logo.png",
    accentColor: "#EB0029",
    accentBg: "rgba(235, 0, 41, 0.08)",
    tokens: ["USDT"],
  },
  {
    id: "bep20",
    title: "BEP-20",
    subtitle: "BNB Smart Chain",
    logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    accentColor: "#F0B90B",
    accentBg: "rgba(240, 185, 11, 0.08)",
    tokens: ["USDT", "USDC"],
  },
  {
    id: "erc20",
    title: "ERC-20",
    subtitle: "Ethereum Network",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    accentColor: "#627EEA",
    accentBg: "rgba(98, 126, 234, 0.08)",
    tokens: ["USDT", "USDC"],
  },
];

export const NETWORK_LABELS: Record<NetworkKey, string> = {
  trc20: "TRC-20 (Tron)",
  bep20: "BEP-20 (BNB Smart Chain)",
  erc20: "ERC-20 (Ethereum)",
};

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
