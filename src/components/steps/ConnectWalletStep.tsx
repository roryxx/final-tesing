import React from "react";
import { useUnifiedWallet } from "@/contexts/UnifiedWalletContext";
import { truncateAddress } from "@/lib/networks";
import StepIndicator from "@/components/StepIndicator";

const ConnectWalletStep: React.FC = () => {
  const {
    evmAddress,
    tronAddress,
    isConnected,
    isConnecting,
    connectAllWallets,
  } = useUnifiedWallet();

  return (
    <>
      <StepIndicator currentStep={1} />

      <h1 className="header-title">Connect Your Wallet</h1>
      <p className="header-subtitle">
        Link your EVM and Tron wallets to continue with the escrow process
      </p>

      {isConnected && evmAddress && tronAddress ? (
        <div className="wallet-chip">
          <div className="wallet-row">
            <span className="wallet-label">EVM Wallet</span>
            <span className="wallet-check">✓</span>
          </div>
          <div className="wallet-address">{truncateAddress(evmAddress)}</div>

          <div className="wallet-row" style={{ marginTop: "0.4rem" }}>
            <span className="wallet-label">Tron Wallet</span>
            <span className="wallet-check">✓</span>
          </div>
          <div className="wallet-address">{truncateAddress(tronAddress)}</div>
        </div>
      ) : null}

      <button
        className="btn-primary"
        onClick={() => connectAllWallets()}
        disabled={isConnecting || isConnected}
      >
        {isConnecting ? (
          <>
            <div className="spinner" />
            Connecting...
          </>
        ) : isConnected ? (
          "Wallets Connected"
        ) : (
          "Connect Wallet"
        )}
      </button>
    </>
  );
};

export default ConnectWalletStep;
