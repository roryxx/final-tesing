import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { NETWORK_LABELS } from "@/lib/networks";
import StepIndicator from "@/components/StepIndicator";

const ResultStep: React.FC = () => {
  const { selectedNetwork, resetWorkflow } = useUnifiedWallet();

  const networkLabel = selectedNetwork ? NETWORK_LABELS[selectedNetwork] : "Network";

  return (
    <>
      <style>{`
        .success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.2rem;
          font-size: 1.8rem;
          color: #16a34a;
          border: 2px solid #86efac;
        }

        .result-network {
          display: inline-block;
          padding: 0.4rem 1rem;
          border-radius: 60px;
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #15803d;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1.4rem;
        }
      `}</style>

      <StepIndicator currentStep={3} />

      <div className="success-icon">✓</div>

      <h1 className="header-title">Approval Complete</h1>
      <p className="header-subtitle">
        Your token approval on {networkLabel} was successful
      </p>

      <div className="result-network">{networkLabel}</div>

      <button className="btn-primary" onClick={() => resetWorkflow()}>
        Try Again
      </button>
    </>
  );
};

export default ResultStep;
