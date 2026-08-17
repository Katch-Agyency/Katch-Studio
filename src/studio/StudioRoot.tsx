import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { StoreProvider } from "@/app/store";
import { ThemeProvider } from "@/app/theme";
import { ToastProvider } from "@/app/toast";
import { registerPWA } from "@/app/pwa";
import { registerErrorReporting } from "@/app/errorReporting";

/* The existing Studio application, isolated behind the mode switch so client
   branches do not boot Firebase, the editor, or deployment UI. */
registerPWA();
registerErrorReporting();

export default function StudioRoot() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
