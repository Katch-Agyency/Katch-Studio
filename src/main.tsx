import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { StoreProvider } from "./app/store";
import { ThemeProvider } from "./app/theme";
import { ToastProvider } from "./app/toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
