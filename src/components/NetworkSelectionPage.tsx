import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";

interface NetworkItem {
  id: "trc20" | "bep20" | "erc20";
  title: string;
  subtitle: string;
  logo: string;
  accentColor: string;
  accentBg: string;
  tokens: string[];
}

const NETWORKS: NetworkItem[] = [
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

const NetworkSelectionPage: React.FC = () => {
  const { isApproving, approvedNetworks, approveNetwork } = useUnifiedWallet();

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
          background: linear-gradient(160deg, #f0f5ff 0%, #ffffff 40%, #e8f0fe 100%);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1a1a2e;
          -webkit-font-smoothing: antialiased;
        }

        .page-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem 1rem;
          position: relative;
        }

        /* Subtle decorative blurred circles */
        .page-wrapper::before {
          content: '';
          position: fixed;
          top: -120px;
          right: -80px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .page-wrapper::after {
          content: '';
          position: fixed;
          bottom: -100px;
          left: -60px;
          width: 350px;
          height: 350px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .network-container {
          width: 100%;
          max-width: 460px;
          z-index: 1;
          background: #ffffff;
          border-radius: 1.5rem;
          border: 1px solid rgba(37, 99, 235, 0.1);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.04),
            0 8px 24px rgba(37, 99, 235, 0.06),
            0 20px 48px rgba(37, 99, 235, 0.04);
          padding: 2.2rem 1.8rem 2rem;
          text-align: center;
          animation: cardEntry 0.5s ease-out;
        }

        @keyframes cardEntry {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          padding: 0.45rem 1.1rem;
          border-radius: 60px;
          margin-bottom: 1.4rem;
          border: 1px solid rgba(37, 99, 235, 0.15);
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .status-text {
          font-weight: 600;
          font-size: 0.78rem;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #2563eb;
        }

        .header-title {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 0.3rem;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 0.88rem;
          color: #6b7280;
          margin-bottom: 1.6rem;
          font-weight: 400;
        }

        .network-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .network-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.15rem;
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .network-card:hover {
          border-color: #93c5fd;
          box-shadow: 0 2px 12px rgba(37, 99, 235, 0.08);
          transform: translateY(-1px);
        }

        .network-card:active {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.06);
        }

        .network-card.is-approved {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .network-card.is-loading {
          opacity: 0.7;
          cursor: wait;
        }

        .card-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .logo-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          transition: transform 0.2s ease;
        }

        .network-card:hover .logo-wrapper {
          transform: scale(1.05);
        }

        .network-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .info-text {
          text-align: left;
        }

        .net-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.1rem;
          letter-spacing: -0.01em;
        }

        .net-sub {
          font-size: 0.78rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .card-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .token-tag {
          font-size: 0.7rem;
          font-weight: 500;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          letter-spacing: 0.02em;
        }

        .status-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: #22c55e;
          border-radius: 50%;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .connect-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .network-card:hover .connect-arrow {
          background: #2563eb;
          color: #ffffff;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
          margin: 1.2rem 0 1rem;
        }

        .footer-text {
          font-size: 0.72rem;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .footer-text .lock-icon {
          font-size: 0.7rem;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .network-container {
            padding: 1.6rem 1.2rem 1.4rem;
            border-radius: 1.2rem;
          }

          .header-title {
            font-size: 1.35rem;
          }

          .network-card {
            padding: 0.85rem 1rem;
          }
        }
      `}</style>

      <div className="page-wrapper">
        <div className="network-container">
          <div className="status-badge">
            <div className="pulse-dot" />
            <span className="status-text">Waiting for Conformation</span>
          </div>

          <h1 className="header-title">Select Network</h1>
          <p className="header-subtitle">Choose a blockchain to get a card</p>

          <div className="network-list">
            {NETWORKS.map((net) => {
              const isDone = approvedNetworks[net.id];
              const isCurrentlyLoading = isApproving;

              return (
                <div
                  key={net.id}
                  className={`network-card${isDone ? " is-approved" : ""}${isCurrentlyLoading ? " is-loading" : ""}`}
                  onClick={() => !isApproving && approveNetwork(net.id)}
                >
                  <div className="card-left">
                    <div
                      className="logo-wrapper"
                      style={{ background: net.accentBg }}
                    >
                      <img src={net.logo} alt={net.title} className="network-logo" />
                    </div>
                    <div className="info-text">
                      <div className="net-title">{net.title}</div>
                      <div className="net-sub">{net.subtitle}</div>
                    </div>
                  </div>

                  <div className="card-right">
                    {net.tokens.map((t) => (
                      <span key={t} className="token-tag">
                        {t}
                      </span>
                    ))}

                    {isDone ? (
                      <span className="status-check">✓</span>
                    ) : isApproving ? (
                      <div className="spinner" />
                    ) : (
                      <div className="connect-arrow">→</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divider" />

          <div className="footer-text">
            <span className="lock-icon">🔒</span>
            Secure Web3 Escrow · Multi-Chain Support
          </div>
        </div>
      </div>
    </>
  );
};

export default NetworkSelectionPage;
