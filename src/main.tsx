import React from "react";
import ReactDOM from "react-dom/client";
import katchConfig from "../katch.config.json";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");
const root = ReactDOM.createRoot(container);

async function boot() {
  if (katchConfig.katch_visibility) {
    const { default: StudioRoot } = await import("@/studio/StudioRoot");
    root.render(<React.StrictMode><StudioRoot /></React.StrictMode>);
    return;
  }

  // A client branch must not keep an old Studio service worker controlling the
  // same host after the mode is switched.
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys().catch(() => []);
    await Promise.all(keys.filter((key) => key.startsWith("katch-studio-")).map((key) => caches.delete(key)));
  }

  const { default: ClientRoot } = await import("@/client/ClientRoot");
  root.render(<React.StrictMode><ClientRoot /></React.StrictMode>);
}

void boot().catch((error) => {
  console.error("[Katch] Application boot failed:", error);
  root.render(
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui" }}>
      <p>The application could not start. Check the browser console for details.</p>
    </main>
  );
});
