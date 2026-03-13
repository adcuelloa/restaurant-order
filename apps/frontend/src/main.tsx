import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import AppProviders from "./app/providers";
import AppRoutes from "./app/routes";

import "./index.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </StrictMode>
  );
}
