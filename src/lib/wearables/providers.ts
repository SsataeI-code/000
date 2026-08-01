/**
 * Wearable providers (§7 — "auto-sync via cloud APIs only: Oura, Fitbit, Garmin,
 * Whoop"). Pure registry + honest availability detection: a provider only offers
 * a real "Connect" button when it's a standard OAuth2 provider AND the owner has
 * configured its API keys. Garmin uses OAuth1.0a (a different handshake) and is
 * listed but not yet wired — shown honestly as "not available yet" so no client
 * stares at a broken button (§7 "be honest in the UI").
 *
 * Apple Health / Apple Watch / Android on-device sync are impossible from a web
 * app (§7) — those clients use the manual step-entry fallback, surfaced in the UI.
 */

export type WearableProvider = "oura" | "fitbit" | "garmin" | "whoop";

export interface ProviderDef {
  id: WearableProvider;
  label: string;
  oauth: "oauth2" | "oauth1";
  envPrefix: string; // <PREFIX>_CLIENT_ID / <PREFIX>_CLIENT_SECRET
  pulls: string; // honest one-liner of what it syncs
  authUrl?: string;
  tokenUrl?: string;
  scope?: string;
}

export const WEARABLE_PROVIDERS: ProviderDef[] = [
  {
    id: "oura",
    label: "Oura",
    oauth: "oauth2",
    envPrefix: "OURA",
    pulls: "Steps, sleep & readiness",
    authUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scope: "daily",
  },
  {
    id: "fitbit",
    label: "Fitbit",
    oauth: "oauth2",
    envPrefix: "FITBIT",
    pulls: "Steps & sleep",
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scope: "activity sleep",
  },
  {
    id: "whoop",
    label: "Whoop",
    oauth: "oauth2",
    envPrefix: "WHOOP",
    pulls: "Sleep, recovery & strain",
    authUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scope: "read:recovery read:sleep read:workout offline",
  },
  {
    id: "garmin",
    label: "Garmin",
    oauth: "oauth1",
    envPrefix: "GARMIN",
    pulls: "Steps & sleep",
  },
];

export function providerDef(id: string): ProviderDef | undefined {
  return WEARABLE_PROVIDERS.find((p) => p.id === id);
}

export type ProviderEnv = Record<string, string | undefined>;

/**
 * Is this provider ready to connect? Only OAuth2 providers with both their
 * client id and secret configured. Everything else (missing keys, or the
 * OAuth1 Garmin flow that isn't wired) reports false → the UI shows it honestly
 * as not-yet-available.
 */
export function providerConfigured(def: ProviderDef, env: ProviderEnv): boolean {
  if (def.oauth !== "oauth2") return false;
  return Boolean(env[`${def.envPrefix}_CLIENT_ID`] && env[`${def.envPrefix}_CLIENT_SECRET`]);
}

/** The provider ids that are ready to connect right now. */
export function configuredProviders(env: ProviderEnv): WearableProvider[] {
  return WEARABLE_PROVIDERS.filter((p) => providerConfigured(p, env)).map((p) => p.id);
}
