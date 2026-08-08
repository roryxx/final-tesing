import React from "react";
import { Toaster as Sonner } from "sonner";
import { UnifiedWalletProvider } from "@/contexts/UnifiedWalletContext";
import EscrowWorkflow from "@/components/EscrowWorkflow";

const App: React.FC = () => (
  <UnifiedWalletProvider>
    <EscrowWorkflow />
    <Sonner position="top-center" richColors />
  </UnifiedWalletProvider>
);

export default App;
