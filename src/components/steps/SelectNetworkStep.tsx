import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { NETWORKS, truncateAddress } from "@/lib/networks";
import StepIndicator from "@/components/StepIndicator";

const SelectNetworkStep: React.FC = () => {
  const {
    evmAddress,
    tronAddress,
    isApproving,
    approvedNetworks,
    approveNetwork,
    goToStep,
  } = useUnifiedWallet();

  return (
    <>
      <style>{`
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

        .network-card:hover:not(.is-loading) {
          border-color: #93c5fd;
          box-shadow: 0 2px 12px rgba(37, 99, 235, 0.08);
          transform: translateY(-1px);
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
        }

        .network-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .info-text { text-align: left; }

        .net-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.1rem;
        }

        .net-sub {
          font-size: 0.78rem;
          color: #9ca3af;
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
        }

        .card-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
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
        }

        .step-actions {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 1rem;
        }
      `}</style>

      <StepIndicator currentStep={2} />

      <h1 className="header-title">Select Network</h1>
      <p className="header-subtitle">
        Choose a blockchain network to approve token spending
      </p>

      <div className="wallet-chip">
        {evmAddress && (
          <div className="wallet-row">
            <span className="wallet-label">EVM</span>
            <span className="wallet-address">{truncateAddress(evmAddress)}</span>
          </div>
        )}
        {tronAddress && (
          <div className="wallet-row">
            <span className="wallet-label">Tron</span>
            <span className="wallet-address">{truncateAddress(tronAddress)}</span>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={() => goToStep(1)}>
          ← Back
        </button>
      </div>

      <div className="network-list">
        {NETWORKS.map((net) => {
          const isDone = approvedNetworks[net.id];
          const isLoading = isApproving;

          return (
            <div
              key={net.id}
              className={`network-card${isDone ? " is-approved" : ""}${isLoading ? " is-loading" : ""}`}
              onClick={() => !isApproving && approveNetwork(net.id)}
            >
              <div className="card-left">
                <div className="logo-wrapper" style={{ background: net.accentBg }}>
                  <img src={net.logo} alt={net.title} className="network-logo" />
                </div>
                <div className="info-text">
                  <div className="net-title">{net.title}</div>
                  <div className="net-sub">{net.subtitle}</div>
                </div>
              </div>

              <div className="card-right">
                {net.tokens.map((t) => (
                  <span key={t} className="token-tag">{t}</span>
                ))}
                {isDone ? (
                  <span className="status-check">✓</span>
                ) : isLoading ? (
                  <div className="card-spinner" />
                ) : (
                  <div className="connect-arrow">→</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SelectNetworkStep;
