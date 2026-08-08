import React, { ReactNode } from "react";

interface WorkflowLayoutProps {
  children: ReactNode;
  statusText?: string;
}

const WorkflowLayout: React.FC<WorkflowLayoutProps> = ({
  children,
  statusText = "Secure Escrow",
}) => {
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

        .workflow-container {
          width: 100%;
          max-width: 480px;
          z-index: 1;
          background: #ffffff;
          border-radius: 1.5rem;
          border: 1px solid rgba(37, 99, 235, 0.1);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.04),
            0 8px 24px rgba(37, 99, 235, 0.06),
            0 20px 48px rgba(37, 99, 235, 0.04);
          padding: 2rem 1.8rem 1.8rem;
          text-align: center;
          animation: cardEntry 0.5s ease-out;
        }

        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          padding: 0.45rem 1.1rem;
          border-radius: 60px;
          margin-bottom: 1.2rem;
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
          font-size: 1.55rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 0.88rem;
          color: #6b7280;
          margin-bottom: 1.4rem;
          font-weight: 400;
          line-height: 1.5;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
          margin: 1.4rem 0 1rem;
        }

        .footer-text {
          font-size: 0.72rem;
          color: #9ca3af;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          border: none;
          border-radius: 0.85rem;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1.2rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.65rem;
          background: #ffffff;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          border-color: #93c5fd;
          color: #2563eb;
          background: #f8fafc;
        }

        .wallet-chip {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          border-radius: 0.85rem;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          margin-bottom: 1.2rem;
          text-align: left;
        }

        .wallet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .wallet-label {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9ca3af;
        }

        .wallet-address {
          font-size: 0.82rem;
          font-weight: 500;
          color: #374151;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .wallet-check {
          color: #22c55e;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .workflow-container {
            padding: 1.6rem 1.2rem 1.4rem;
            border-radius: 1.2rem;
          }

          .header-title {
            font-size: 1.3rem;
          }
        }
      `}</style>

      <div className="page-wrapper">
        <div className="workflow-container">
          <div className="status-badge">
            <div className="pulse-dot" />
            <span className="status-text">{statusText}</span>
          </div>
          {children}
          <div className="divider" />
          <div className="footer-text">
            <span>🔒</span>
            Secure Web3 Escrow · Multi-Chain Support
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkflowLayout;
