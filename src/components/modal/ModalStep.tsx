import React, { ReactNode } from "react";

interface ModalStepProps {
  step: number;
  currentStep: number;
  title: string;
  subtitle: string;
  description?: string;
  children?: ReactNode;
}

const ModalStep: React.FC<ModalStepProps> = ({
  step,
  currentStep,
  title,
  subtitle,
  description,
  children,
}) => {
  const isActive = currentStep === step;
  const isCompleted = currentStep > step;

  return (
    <div className={`step${isActive ? "" : " inactive"}${isCompleted ? " step-completed" : ""}`}>
      <div className="step-header">
        <div className="step-number">{isCompleted ? "✓" : step}</div>
        <div className="step-title-group">
          <h3>{title}</h3>
          <p className="step-subtitle">{subtitle}</p>
        </div>
      </div>
      {isActive && (
        <div className="step-content">
          {description && <p>{description}</p>}
          {children}
        </div>
      )}
    </div>
  );
};

export default ModalStep;
