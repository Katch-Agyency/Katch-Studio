let registered = false;

export function registerErrorReporting() {
  if (registered || typeof window === "undefined") return;
  registered = true;

  window.addEventListener("error", (event) => {
    console.error("Unhandled application error", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection", event.reason);
  });
}