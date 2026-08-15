/* Test entry — mounts the real app in whatever DOM is available.
   Bundled with esbuild for the jsdom render smoke test.
   Exposes window.__TEST_NAV__(path) for in-process SPA navigation. */

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import App from "@/app/App";
import { StoreProvider } from "@/app/store";
import { ThemeProvider } from "@/app/theme";
import { ToastProvider } from "@/app/toast";

function NavBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    (window as unknown as { __TEST_NAV__?: (path: string) => void }).__TEST_NAV__ = (path: string) =>
      navigate(path);
  }, [navigate]);
  return null;
}

const path = (window as unknown as { __TEST_PATH__?: string }).__TEST_PATH__ ?? "/";

const el = document.getElementById("root");
const root = createRoot(el!);
root.render(
  <MemoryRouter initialEntries={[path]}>
    <NavBridge />
    <ThemeProvider>
      <ToastProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ToastProvider>
    </ThemeProvider>
  </MemoryRouter>
);
