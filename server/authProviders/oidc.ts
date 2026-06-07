// Generic OpenID Connect provider using openid-client v6.
// Microsoft Entra ID is just a configured OIDC issuer (issuer URL
// https://login.microsoftonline.com/<tenant>/v2.0). Keeps the useful extras
// from the previous Entra-specific module: PKCE and a proper end-session
// (logout) redirect.
import * as oidc from "openid-client";
import type { Request, Response } from "express";

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  providerName: string;
  postLogoutRedirectUri?: string;
  // Claim mappings
  subjectClaim: string;
  usernameClaim: string;
  nameClaim: string;
  emailClaim: string;
}

export function getOidcConfig(): OidcConfig {
  const appUrl = process.env.APP_URL || "http://localhost:5000";
  return {
    issuerUrl: process.env.OIDC_ISSUER_URL || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: process.env.OIDC_REDIRECT_URI || `${appUrl}/api/auth/callback`,
    scope: process.env.OIDC_SCOPE || "openid profile email",
    providerName: process.env.OIDC_PROVIDER_NAME || "SSO",
    postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
    subjectClaim: process.env.OIDC_CLAIM_SUBJECT || "sub",
    usernameClaim: process.env.OIDC_CLAIM_USERNAME || "preferred_username",
    nameClaim: process.env.OIDC_CLAIM_NAME || "name",
    emailClaim: process.env.OIDC_CLAIM_EMAIL || "email",
  };
}

export function isOidcConfigured(): boolean {
  return Boolean(process.env.OIDC_ISSUER_URL && process.env.OIDC_CLIENT_ID);
}

// Cached OIDC configuration (discovered from the issuer once).
let cachedConfig: oidc.Configuration | null = null;

async function getConfiguration(): Promise<oidc.Configuration> {
  if (cachedConfig) return cachedConfig;
  const cfg = getOidcConfig();
  if (!cfg.issuerUrl || !cfg.clientId) {
    throw new Error("OIDC_ISSUER_URL and OIDC_CLIENT_ID must be set");
  }
  cachedConfig = await oidc.discovery(
    new URL(cfg.issuerUrl),
    cfg.clientId,
    cfg.clientSecret,
  );
  return cachedConfig;
}

// Start the OIDC authorization flow — redirects the browser to the IdP.
export async function startOidcFlow(req: Request, res: Response): Promise<void> {
  const cfg = getOidcConfig();
  const config = await getConfiguration();

  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();

  // Persist PKCE verifier, state & nonce in session to verify the callback.
  req.session.oidcCodeVerifier = codeVerifier;
  req.session.oidcState = state;
  req.session.oidcNonce = nonce;

  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: cfg.redirectUri,
    scope: cfg.scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  res.redirect(url.href);
}

export interface OidcCallbackResult {
  success: boolean;
  message?: string;
  idToken?: string;
  user?: { subjectId: string; username: string; name: string; email: string };
}

// Handle the IdP callback and extract the authenticated user.
export async function handleOidcCallback(req: Request): Promise<OidcCallbackResult> {
  const cfg = getOidcConfig();
  const config = await getConfiguration();

  const codeVerifier = req.session.oidcCodeVerifier;
  const expectedState = req.session.oidcState;
  const expectedNonce = req.session.oidcNonce;

  // Clear one-time values from the session.
  req.session.oidcCodeVerifier = undefined;
  req.session.oidcState = undefined;
  req.session.oidcNonce = undefined;

  if (!codeVerifier || !expectedState) {
    return { success: false, message: "Missing PKCE/state in session" };
  }

  try {
    // Rebuild the callback URL from the configured redirect URI so the
    // redirect_uri used during the token exchange exactly matches what was
    // registered with the IdP. Deriving the origin from req.protocol/host is
    // unsafe behind a reverse proxy (req.protocol can be "http" even when the
    // public origin is HTTPS), which would cause a redirect-URI mismatch.
    const callbackUrl = new URL(cfg.redirectUri);
    const incoming = new URL(
      req.originalUrl,
      `${req.protocol}://${req.get("host")}`,
    );
    callbackUrl.search = incoming.search;

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
      expectedNonce,
    });

    const claims = tokens.claims();
    if (!claims) return { success: false, message: "No claims in token" };

    const subjectId = String(claims[cfg.subjectClaim] ?? claims.sub);
    const username = String(claims[cfg.usernameClaim] ?? claims.sub);
    const name = String(claims[cfg.nameClaim] ?? username);
    const email = String(claims[cfg.emailClaim] ?? "").toLowerCase();

    return {
      success: true,
      idToken: tokens.id_token,
      user: { subjectId, username, name, email },
    };
  } catch (err) {
    console.error("[auth] OIDC callback error:", err);
    return { success: false, message: "Authentication failed" };
  }
}

// Build the IdP end-session (logout) URL so the user is signed out at the
// provider, not just locally.
export async function buildOidcLogoutUrl(idTokenHint?: string): Promise<string> {
  const cfg = getOidcConfig();
  const config = await getConfiguration();
  const postLogoutRedirect =
    cfg.postLogoutRedirectUri || `${new URL(cfg.redirectUri).origin}/login`;

  const url = oidc.buildEndSessionUrl(config, {
    post_logout_redirect_uri: postLogoutRedirect,
    ...(idTokenHint ? { id_token_hint: idTokenHint } : {}),
  });
  return url.href;
}
