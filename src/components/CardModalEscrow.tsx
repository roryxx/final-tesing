import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { NETWORKS } from "@/lib/networks";
import { CARD_TIERS, getCardTierById, type CardTierId } from "@/lib/cardTypes";

type ModalPhase = "card-select" | "card-review" | "escrow";

const CardModalEscrow: React.FC = () => {
  const [modalTarget, setModalTarget] = useState<HTMLElement | null>(null);
  const [modalPhase, setModalPhase] = useState<ModalPhase>("card-select");
  const [selectedCardId, setSelectedCardId] = useState<CardTierId>("classic");

  useEffect(() => {
    setModalTarget(document.getElementById("escrow-modal-target"));
  }, []);

  useEffect(() => {
    const modal = document.getElementById("obtain-card-modal");
    if (!modal) return;

    let wasActive = modal.classList.contains("active");
    const observer = new MutationObserver(() => {
      const isActive = modal.classList.contains("active");
      if (isActive && !wasActive) {
        setModalPhase("card-select");
        setSelectedCardId("classic");
      }
      wasActive = isActive;
    });

    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
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

  const selectedCard = getCardTierById(selectedCardId) ?? CARD_TIERS[0];

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

  const cardSelectView = (
    <>
      <div className="modal-header card-flow-header">
        <h2>Issue Card</h2>
        <p className="card-flow-subtitle">Select the card that suits your style.</p>
      </div>

      <div className="card-tier-list">
        {CARD_TIERS.map((tier) => {
          const isSelected = tier.id === selectedCardId;
          return (
            <button
              key={tier.id}
              type="button"
              className={`card-tier-option${isSelected ? " is-selected" : ""}`}
              onClick={() => setSelectedCardId(tier.id)}
            >
              <div className={`card-tier-preview ${tier.previewClass}`}>
                <img src="images/logo/trust-icon.svg" alt="" className="card-tier-logo" />
                <span className="card-tier-brand">Trust</span>
              </div>
              <div className="card-tier-info">
                <div className="card-tier-title-row">
                  <span className="card-tier-name">{tier.name}</span>
                  {tier.badge && <span className="card-tier-badge">{tier.badge}</span>}
                </div>
                <p className="card-tier-desc">{tier.description}</p>
              </div>
              <span className="card-tier-radio" aria-hidden="true">
                {isSelected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-primary btn-large step-button modal-button card-flow-cta"
        onClick={() => setModalPhase("card-review")}
      >
        Continue <span className="card-flow-arrow">→</span>
      </button>
    </>
  );

  const cardReviewView = (
    <>
      <div className="card-review-top">
        <button
          type="button"
          className="card-flow-back"
          onClick={() => setModalPhase("card-select")}
          aria-label="Back"
        >
          ←
        </button>
        <h2 className="card-review-title">Review</h2>
      </div>

      <div className="card-review-ready">
        <span className="card-review-check">✓</span>
        <div>
          <strong>Ready to issue.</strong>
          <p>Review your card before issuance.</p>
        </div>
      </div>

      <div className="card-review-details">
        <div className="card-review-row">
          <span>Card</span>
          <strong>{selectedCard.name}</strong>
        </div>
        <div className="card-review-row">
          <span>Cashback</span>
          <strong>{selectedCard.cashback}</strong>
        </div>
        <div className="card-review-row">
          <span>Annual fee</span>
          <strong className="card-review-free">{selectedCard.annualFee}</strong>
        </div>
      </div>

      <p className="card-perks-label">Included perks</p>
      <div className="card-perks-grid">
        {selectedCard.perks.map((perk) => (
          <div key={perk.label} className="card-perk-item">
            <span className="card-perk-icon">{perk.icon}</span>
            <span>{perk.label}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary btn-large step-button modal-button card-flow-cta"
        onClick={() => setModalPhase("escrow")}
      >
        Activate your card <span className="card-flow-arrow">→</span>
      </button>
    </>
  );

  const escrowWorkflowView = (
    <>
      <div className="modal-header">
        <h2>Get Your Crypto Card</h2>
        <p className="card-flow-subtitle card-selected-note">
          Selected: <strong>{selectedCard.name}</strong> card
        </p>
      </div>

      <div className="steps-container">
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
    </>
  );

  const content = (
    <>
      <style>{`
        .card-flow-header {
          text-align: center;
          margin-bottom: 0.75rem;
        }

        .card-flow-subtitle {
          color: #666;
          font-size: 0.85rem;
          margin: 0.35rem 0 0;
        }

        .card-selected-note {
          margin-top: 0.25rem;
        }

        .card-tier-list {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          margin-bottom: 1rem;
        }

        .card-tier-option {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          width: 100%;
          padding: 0.65rem 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .card-tier-option:hover {
          border-color: var(--primary-color);
          background: #f5f8ff;
        }

        .card-tier-option.is-selected {
          border-color: var(--primary-color);
          background: #f5f8ff;
          box-shadow: 0 0 0 1px rgba(0, 82, 255, 0.15);
        }

        .card-tier-preview {
          width: 56px;
          height: 36px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #fff;
          font-size: 0.55rem;
          gap: 2px;
        }

        .card-preview-classic {
          background: linear-gradient(135deg, #4a90e2, #0052ff);
        }

        .card-preview-gold {
          background: linear-gradient(135deg, #d4a853, #8b6914);
        }

        .card-preview-black {
          background: linear-gradient(135deg, #2a2a2a, #111);
        }

        .card-tier-logo {
          width: 14px;
          height: 14px;
          filter: brightness(0) invert(1);
        }

        .card-tier-brand {
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .card-tier-info {
          flex: 1;
          min-width: 0;
        }

        .card-tier-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.15rem;
        }

        .card-tier-name {
          font-weight: 700;
          color: var(--dark-color);
          font-size: 0.92rem;
        }

        .card-tier-badge {
          font-size: 0.68rem;
          color: var(--primary-color);
          font-weight: 600;
        }

        .card-tier-desc {
          font-size: 0.72rem;
          color: #666;
          line-height: 1.35;
          margin: 0;
        }

        .card-tier-radio {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: #fff;
          flex-shrink: 0;
        }

        .card-tier-option.is-selected .card-tier-radio {
          background: var(--primary-color);
          border-color: var(--primary-color);
        }

        .card-flow-cta {
          width: 100%;
          margin-top: 0.25rem;
        }

        .card-flow-arrow {
          margin-left: 0.25rem;
        }

        .card-review-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .card-flow-back {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #666;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          line-height: 1;
        }

        .card-review-title {
          flex: 1;
          text-align: center;
          font-size: 1.1rem;
          margin: 0;
          color: var(--dark-color);
        }

        .card-review-ready {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          margin-bottom: 0.85rem;
        }

        .card-review-check {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #22c55e;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .card-review-ready strong {
          display: block;
          color: var(--dark-color);
          font-size: 0.95rem;
        }

        .card-review-ready p {
          margin: 0.15rem 0 0;
          font-size: 0.8rem;
          color: #666;
        }

        .card-review-details {
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 0.65rem 0.85rem;
          margin-bottom: 0.85rem;
        }

        .card-review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0;
          font-size: 0.85rem;
          color: #666;
        }

        .card-review-row + .card-review-row {
          border-top: 1px solid #f0f0f0;
        }

        .card-review-row strong {
          color: var(--dark-color);
        }

        .card-review-free {
          color: #16a34a;
        }

        .card-perks-label {
          text-align: center;
          font-size: 0.68rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888;
          margin: 0 0 0.5rem;
        }

        .card-perks-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.45rem;
          margin-bottom: 1rem;
        }

        .card-perk-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.55rem;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          font-size: 0.72rem;
          color: var(--dark-color);
          background: #fafafa;
        }

        .card-perk-icon {
          color: var(--primary-color);
          font-size: 0.8rem;
        }

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

        .escrow-alert-overlay,
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

        .escrow-alert-box,
        .server-down-box {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 320px;
          width: 100%;
          text-align: center;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .escrow-alert-box h3,
        .server-down-box h3 {
          color: #dc2626;
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }

        .escrow-alert-box p,
        .server-down-box p {
          color: #666;
          font-size: 0.85rem;
          margin: 0 0 1rem;
          line-height: 1.5;
        }
      `}</style>

      {modalPhase === "card-select" && cardSelectView}
      {modalPhase === "card-review" && cardReviewView}
      {modalPhase === "escrow" && escrowWorkflowView}

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
