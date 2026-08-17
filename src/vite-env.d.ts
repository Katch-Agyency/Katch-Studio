/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase (Firestore) sync — see docs/FIREBASE.md. Optional; localStorage is used when unset. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  /** Workspace id inside Firestore — one workspace per team. Defaults to "katch-prod". */
  readonly VITE_FIREBASE_WORKSPACE_ID?: string;
  /** Sentry DSN for error + performance monitoring. Optional — no DSN, no reporting. */
  readonly VITE_SENTRY_DSN?: string;
}
