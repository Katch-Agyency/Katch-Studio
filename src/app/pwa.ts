/* ============================================================
   PWA bootstrap — registers the service worker (production only,
   so it never interferes with Vite's dev server) and exposes:
   - install prompt (beforeinstallprompt)
   - update-available flow (controllerchange)
   - online/offline status
   ============================================================ */

export interface DeferredInstallPrompt {
  prompt: () => Promise<void>;
}

export type PWAState = {
  canInstall: boolean;
  install: (() => Promise<void>) | null;
  updateReady: boolean;
  applyUpdate: () => void;
  online: boolean;
};

const listeners = new Set<(s: PWAState) => void>();
let state: PWAState = {
  canInstall: false,
  install: null,
  updateReady: false,
  applyUpdate: () => undefined,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
};

function setState(patch: Partial<PWAState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function subscribePWA(listener: (s: PWAState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getPWAState(): PWAState {
  return state;
}

let installed = false;
let deferred: DeferredInstallPrompt | null = null;

export function registerPWA(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  /* Install prompt */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    const ev = e as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    deferred = { prompt: () => ev.prompt() };
    setState({ canInstall: true, install: () => deferred?.prompt() ?? Promise.resolve() });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    setState({ canInstall: false });
  });

  /* Online / offline */
  window.addEventListener("online", () => setState({ online: true }));
  window.addEventListener("offline", () => setState({ online: false }));

  /* Service worker — production builds only */
  if (!import.meta.env.PROD) return;

  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      /* New worker took control (after Apply Update) → reload once */
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        /* A waiting worker means a new version is available */
        if (reg.waiting) {
          setState({
            updateReady: true,
            applyUpdate: () => reg.waiting?.postMessage("SKIP_WAITING"),
          });
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setState({
                updateReady: true,
                applyUpdate: () => worker.postMessage("SKIP_WAITING"),
              });
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[Katch Studio] Service worker registration failed:", err);
      });
  }
}
