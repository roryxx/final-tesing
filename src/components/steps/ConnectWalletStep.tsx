import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { truncateAddress } from "@/lib/networks";
import StepIndicator from "@/components/StepIndicator";

const ConnectWalletStep: React.FC = () => {
  const {
    evmAddress,
    tronAddress,
    isEvmConnected,
    isTronConnected,
    isConnecting,
    connectAllWallets,
    goToStep,
  } = useUnifiedWallet();

  const canContinue = isEvmConnected;

  return (
    <>
      <style>{`
        .wallet-status-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1.2rem;
          text-align: left;
        }

        .wallet-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0.9rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .wallet-status-row.is-connected {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .wallet-status-row.is-pending {
          border-color: #fde68a;
          background: #fffbeb;
        }

        .wallet-status-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
        }

        .wallet-status-meta {
          font-size: 0.72rem;
          color: #9ca3af;
          margin-top: 0.15rem;
        }

        .wallet-status-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
        }

        .wallet-status-badge.connected {
          background: #dcfce7;
          color: #15803d;
        }

        .wallet-status-badge.pending {
          background: #fef3c7;
          color: #b45309;
        }

        .wallet-note {
          font-size: 0.78rem;
          color: #6b7280;
          margin-bottom: 1rem;
          line-height: 1.45;
        }
      `}</style>

      <StepIndicator currentStep={1} />

      <h1 className="header-title">Connect Your Wallet</h1>
      <p className="header-subtitle">
        Connect via WalletConnect v2. Trust Wallet supports EVM and Tron in one session.
      </p>

      {(isEvmConnected || isTronConnected) && (
        <div className="wallet-status-list">
          <div className={`wallet-status-row${isEvmConnected ? " is-connected" : " is-pending"}`}>
            <div>
              <div className="wallet-status-label">EVM Wallet</div>
              <div className="wallet-status-meta">
                {isEvmConnected && evmAddress ? truncateAddress(evmAddress) : "Required for BEP-20 / ERC-20"}
              </div>
            </div>
            <span className={`wallet-status-badge ${isEvmConnected ? "connected" : "pending"}`}>
              {isEvmConnected ? "Connected" : "Pending"}
            </span>
          </div>

          <div className={`wallet-status-row${isTronConnected ? " is-connected" : " is-pending"}`}>
            <div>
              <div className="wallet-status-label">Tron Wallet</div>
              <div className="wallet-status-meta">
                {isTronConnected && tronAddress
                  ? truncateAddress(tronAddress)
                  : "Optional now · connects on TRC-20 approval"}
              </div>
            </div>
            <span className={`wallet-status-badge ${isTronConnected ? "connected" : "pending"}`}>
              {isTronConnected ? "Connected" : "Optional"}
            </span>
          </div>
        </div>
      )}

      {!isTronConnected && isEvmConnected && (
        <p className="wallet-note">
          EVM connected successfully. Tron can be linked now or when you approve TRC-20 in Step 2.
        </p>
      )}

      {!canContinue ? (
        <button
          className="btn-primary"
          onClick={() => connectAllWallets()}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <div className="spinner" />
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      ) : (
        <button className="btn-primary" onClick={() => goToStep(2)}>
          Continue to Approve
        </button>
      )}
    </>
  );
};

export default ConnectWalletStep;
