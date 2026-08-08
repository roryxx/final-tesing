import React from "react";
import { Toaster as Sonner } from "sonner";
import { UnifiedWalletProvider } from "@/contexts/UnifiedWalletContext";
import CardModalEscrow from "@/components/CardModalEscrow";

const App: React.FC = () => (
  <UnifiedWalletProvider>
    <CardModalEscrow />
    <Sonner position="top-center" richColors />
  </UnifiedWalletProvider>
);

export default App;
