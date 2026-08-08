import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "../css/styles.css";
import "./index.css";

const escrowRoot = document.getElementById("escrow-root");
if (escrowRoot) {
  createRoot(escrowRoot).render(<App />);
}
