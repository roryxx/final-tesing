import React from "react";
import type { WorkflowStep } from "@/contexts/UnifiedWalletContext";

interface StepIndicatorProps {
  currentStep: WorkflowStep;
}

const STEPS = [
  { step: 1 as WorkflowStep, label: "Connect" },
  { step: 2 as WorkflowStep, label: "Scan" },
  { step: 3 as WorkflowStep, label: "Complete" },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <>
      <style>{`
        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 1.6rem;
          padding: 0 0.5rem;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          flex: 1;
          position: relative;
        }

        .step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 14px;
          left: calc(50% + 16px);
          width: calc(100% - 32px);
          height: 2px;
          background: #e5e7eb;
          z-index: 0;
        }

        .step-item.is-completed:not(:last-child)::after {
          background: #22c55e;
        }

        .step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          border: 2px solid #e5e7eb;
          background: #ffffff;
          color: #9ca3af;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .step-item.is-active .step-circle {
          border-color: #2563eb;
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
        }

        .step-item.is-completed .step-circle {
          border-color: #22c55e;
          background: #22c55e;
          color: #ffffff;
        }

        .step-label {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: #9ca3af;
        }

        .step-item.is-active .step-label {
          color: #2563eb;
        }

        .step-item.is-completed .step-label {
          color: #22c55e;
        }

        @media (max-width: 380px) {
          .step-label {
            font-size: 0.6rem;
          }
        }
      `}</style>

      <div className="step-indicator">
        {STEPS.map(({ step, label }) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;

          return (
            <div
              key={step}
              className={`step-item${isActive ? " is-active" : ""}${isCompleted ? " is-completed" : ""}`}
            >
              <div className="step-circle">
                {isCompleted ? "✓" : step}
              </div>
              <span className="step-label">{label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default StepIndicator;
