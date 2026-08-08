import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import WorkflowLayout from "@/components/shared/WorkflowLayout";
import ConnectWalletStep from "@/components/steps/ConnectWalletStep";
import SelectNetworkStep from "@/components/steps/SelectNetworkStep";
import ResultStep from "@/components/steps/ResultStep";

const STEP_STATUS: Record<number, string> = {
  1: "Step 1 · Connect Wallet",
  2: "Step 2 · Scan Network",
  3: "Step 3 · Complete",
};

const EscrowWorkflow: React.FC = () => {
  const { currentStep } = useUnifiedWallet();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ConnectWalletStep />;
      case 2:
        return <SelectNetworkStep />;
      case 3:
        return <ResultStep />;
      default:
        return <ConnectWalletStep />;
    }
  };

  return (
    <WorkflowLayout statusText={STEP_STATUS[currentStep] ?? "Secure Escrow"}>
      {renderStep()}
    </WorkflowLayout>
  );
};

export default EscrowWorkflow;
