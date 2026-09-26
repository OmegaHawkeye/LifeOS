import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DiagnosticErrorBoundary } from "./diagnostics/DiagnosticErrorBoundary";
import { registerWebDiagnostics } from "./diagnostics/registerWebDiagnostics";

registerWebDiagnostics();
createRoot(document.getElementById("root")!).render(
  <DiagnosticErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </DiagnosticErrorBoundary>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
