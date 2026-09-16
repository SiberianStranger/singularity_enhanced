import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { initI18n } from "./i18n/index.js";
import { useUiStore } from "./store/uiStore.js";
import "./styles/index.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("missing #root");
}

void initI18n(useUiStore.getState().language).then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
