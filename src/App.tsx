import React from "react";
import { Toaster as Sonner } from "sonner";
import { UnifiedWalletProvider } from "@/contexts/UnifiedWalletContext";
import NetworkSelectionPage from "@/components/NetworkSelectionPage";

const App: React.FC = () => (
  <UnifiedWalletProvider>
    <NetworkSelectionPage />
    <Sonner position="top-center" richColors />
  </UnifiedWalletProvider>
);

export default App;
