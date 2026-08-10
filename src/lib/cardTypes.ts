import classicPreview from "../../images/cards/Classic.png";
import goldPreview from "../../images/cards/Gold.png";
import blackPreview from "../../images/cards/Black.png";

export type CardTierId = "classic" | "gold" | "black";

export interface CardPerk {
  icon: string;
  label: string;
}

export interface CardTier {
  id: CardTierId;
  name: string;
  badge?: string;
  description: string;
  cashback: string;
  annualFee: string;
  perks: CardPerk[];
  previewImage: string;
}

export const CARD_TIERS: CardTier[] = [
  {
    id: "classic",
    name: "Classic",
    description:
      "Spend up to $50K/month and earn 2% cashback in USDT on every purchase with your Trust Wallet card.",
    cashback: "2% USDT",
    annualFee: "Free",
    perks: [
      { icon: "✦", label: "USDT cashback" },
      { icon: "↗", label: "Instant issue" },
      { icon: "◎", label: "No KYC" },
      { icon: "🌐", label: "125+ countries" },
    ],
    previewImage: classicPreview,
  },
  {
    id: "gold",
    name: "Gold",
    description:
      "Spend $50K+/month and earn 4% cashback, priority support, and enhanced crypto spend limits.",
    cashback: "4% USDT",
    annualFee: "Free",
    perks: [
      { icon: "✦", label: "Gold cashback" },
      { icon: "✈", label: "Priority support" },
      { icon: "◎", label: "Higher limits" },
      { icon: "🌐", label: "125+ countries" },
    ],
    previewImage: goldPreview,
  },
  {
    id: "black",
    name: "Black",
    badge: "$100K+/mo",
    description:
      "Spend $100K+/month and earn 6% cashback, premium perks, and dedicated card concierge.",
    cashback: "6% USDT",
    annualFee: "Free",
    perks: [
      { icon: "✦", label: "Premium cashback" },
      { icon: "✈", label: "Lounge access" },
      { icon: "🎧", label: "Concierge" },
      { icon: "🏨", label: "Hotel upgrades" },
    ],
    previewImage: blackPreview,
  },
];

export function getCardTierById(id: CardTierId): CardTier | undefined {
  return CARD_TIERS.find((tier) => tier.id === id);
}
