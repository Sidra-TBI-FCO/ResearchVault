// OpenID Connect provider using openid-client v6
import * as oidcClient from "openid-client";
import type { Request, Response } from "express";

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  providerName: string;
  // Claim mappings
  usernameClaim: string;
  nameClaim: string;
  emailClaim: string;
}

export function getOidcConfig(): OidcConfig {
  return {
    issuerUrl:     process.env.OIDC_ISSUER_URL     || "",
    clientId:      process.env.OIDC_CLIENT_ID      || "",
    clientSecret:  process.env.OIDC_CLIENT_SECRET  || "",
    redirectUri:   process.env.OIDC_REDIRECT_URI   || `${process.env.APP_URL || "http://localhost:5000"}/api/auth/callback`,
    scope:         process.env.OIDC_SCOPE          || "openid profile email",
    providerName:  process.env.OIDC_PROVIDER_NAME  || "SSO",
    usernameClaim: process.env.OIDC_CLAIM_USERNAME || "preferred_username",
    nameClaim:     process.env.OIDC_CLAIM_NAME     || "name",
    emailClaim:    process.env.OIDC_CLAIM_EMAIL    || "email",
  };
}

// Cached OIDC configuration (discovered from the issuer once)
let cachedOidcConfig: oidcClient.Configuration | null = null;

async function getOidcConfiguration(): Promise<oidcClient.Configuration> {
  if (cachedOidcConfig) return cachedOidcConfig;

  const cfg = getOidcConfig();
  if (!cfg.issuerUrl || !cfg.clientId) {
    throw new Error("OIDC_ISSUER_URL and OIDC_CLIENT_ID must be set");
  }

  cachedOidcConfig = await oidcClient.discovery(
    new URL(cfg.issuerUrl),
    cfg.clientId,
    cfg.clientSecret,
  );
  return cachedOidcConfig;
}

// Start the OIDC authorization flow — redirects browser to the IDP
export async function startOidcFlow(req: Request, res: Response): Promise<void> {
  const cfg = getOidcConfig();
  const config = await getOidcConfiguration();

  const state = oidcClient.randomState();
  const nonce = oidcClient.randomNonce();

  // Persist state & nonce in session to verify the callback
  (req.session as any).oidcState = state;
  (req.session as any).oidcNonce = nonce;

  const redirectUrl = oidcClient.buildAuthorizationUrl(config, {
    redirect_uri: cfg.redirectUri,
    scope: cfg.scope,
    state,
    nonce,
  });

  res.redirect(redirectUrl.href);
}

export interface OidcCallbackResult {
  success: boolean;
  message?: string;
  user?: { username: string; name: string; email: string };
}

// Handle the IDP callback and extract the authenticated user
export async function handleOidcCallback(
  req: Request,
): Promise<OidcCallbackResult> {
  const cfg = getOidcConfig();
  const config = await getOidcConfiguration();

  const expectedState = (req.session as any).oidcState as string | undefined;
  const expectedNonce = (req.session as any).oidcNonce as string | undefined;

  // Clear state from session
  delete (req.session as any).oidcState;
  delete (req.session as any).oidcNonce;

  try {
    const callbackUrl = new URL(
      req.url,
      process.env.APP_URL || "http://localhost:5000",
    );

    const tokens = await oidcClient.authorizationCodeGrant(config, callbackUrl, {
      expectedState,
      expectedNonce,
    });

    const claims = tokens.claims();
    if (!claims) return { success: false, message: "No claims in token" };

    const username = String(claims[cfg.usernameClaim] ?? claims.sub);
    const name     = String(claims[cfg.nameClaim]     ?? username);
    const email    = String(claims[cfg.emailClaim]    ?? "");

    return { success: true, user: { username, name, email } };
  } catch (err) {
    console.error("OIDC callback error:", err);
    return { success: false, message: "Authentication failed" };
  }
}
