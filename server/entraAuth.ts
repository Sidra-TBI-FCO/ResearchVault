import type { Express, Request, Response } from "express";
import * as client from "openid-client";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface EntraConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  defaultRole: string;
  postLogoutRedirectUri?: string;
}

function readConfig(): EntraConfig | null {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = process.env.AZURE_REDIRECT_URI;

  if (!tenantId || !clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    defaultRole: process.env.AZURE_DEFAULT_ROLE || "Investigator",
    postLogoutRedirectUri: process.env.AZURE_POST_LOGOUT_REDIRECT_URI,
  };
}

const entraConfig = readConfig();
export const isEntraEnabled = entraConfig !== null;

declare module "express-session" {
  interface SessionData {
    entraState?: string;
    entraCodeVerifier?: string;
    entraIdToken?: string;
  }
}

let oidcConfigPromise: Promise<client.Configuration> | null = null;

async function getOidcConfig(): Promise<client.Configuration> {
  if (!entraConfig) {
    throw new Error("Microsoft Entra ID sign-in is not configured");
  }
  if (!oidcConfigPromise) {
    const issuer = new URL(
      `https://login.microsoftonline.com/${entraConfig.tenantId}/v2.0`,
    );
    oidcConfigPromise = client.discovery(
      issuer,
      entraConfig.clientId,
      entraConfig.clientSecret,
    );
  }
  return oidcConfigPromise;
}

interface MicrosoftClaims {
  oid?: string;
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

async function provisionUser(claims: MicrosoftClaims) {
  if (!entraConfig) throw new Error("Entra not configured");

  const oid = claims.oid || claims.sub;
  const email = (claims.email || claims.preferred_username || "").toLowerCase();
  const name =
    claims.name ||
    [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
    email;

  if (!oid) {
    throw new Error("Microsoft token missing subject identifier (oid/sub)");
  }
  if (!email) {
    throw new Error("Microsoft token missing email/preferred_username");
  }

  // Try by entraOid first, then by email
  let existing = await db
    .select()
    .from(users)
    .where(eq(users.entraOid, oid))
    .limit(1);

  if (existing.length === 0) {
    existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  }

  if (existing.length > 0) {
    const found = existing[0];
    // Backfill provider/oid if missing
    if (!found.entraOid || found.authProvider !== "entra") {
      await db
        .update(users)
        .set({ entraOid: oid, authProvider: "entra" })
        .where(eq(users.id, found.id));
    }
    return found;
  }

  const username = email;
  const [created] = await db
    .insert(users)
    .values({
      username,
      password: "", // unused for SSO accounts
      name,
      email,
      role: entraConfig.defaultRole,
      authProvider: "entra",
      entraOid: oid,
    })
    .returning();
  return created;
}

export function logEntraStatus() {
  if (isEntraEnabled) {
    console.log(
      `[auth] Microsoft Entra ID sign-in ENABLED (tenant=${entraConfig!.tenantId}, clientId=${entraConfig!.clientId}, defaultRole=${entraConfig!.defaultRole})`,
    );
  } else {
    console.log(
      "[auth] Microsoft Entra ID sign-in DISABLED. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_REDIRECT_URI (and optionally AZURE_DEFAULT_ROLE, AZURE_POST_LOGOUT_REDIRECT_URI) to enable.",
    );
  }
}

export function registerEntraRoutes(app: Express) {
  if (!isEntraEnabled || !entraConfig) return;

  app.get("/api/auth/microsoft/login", async (req: Request, res: Response) => {
    try {
      const config = await getOidcConfig();
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();

      req.session.entraCodeVerifier = codeVerifier;
      req.session.entraState = state;

      const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: entraConfig.redirectUri,
        scope: "openid profile email offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
      });

      res.redirect(authUrl.href);
    } catch (err) {
      console.error("[auth] Microsoft login init failed:", err);
      res.status(500).send("Failed to initiate Microsoft sign-in");
    }
  });

  app.get(
    "/api/auth/microsoft/callback",
    async (req: Request, res: Response) => {
      try {
        const config = await getOidcConfig();
        const codeVerifier = req.session.entraCodeVerifier;
        const expectedState = req.session.entraState;
        if (!codeVerifier || !expectedState) {
          return res.status(400).send("Missing PKCE/state in session");
        }

        // Build the callback URL from the configured AZURE_REDIRECT_URI so the
        // redirect_uri sent during the token exchange exactly matches what was
        // registered with Azure. Deriving it from req.protocol/host is unsafe
        // behind a reverse proxy (req.protocol can be "http" even when the
        // public origin is HTTPS), which would cause a redirect-URI mismatch.
        const callbackUrl = new URL(entraConfig.redirectUri);
        const incoming = new URL(
          req.originalUrl,
          `${req.protocol}://${req.get("host")}`,
        );
        callbackUrl.search = incoming.search;

        const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
          pkceCodeVerifier: codeVerifier,
          expectedState,
        });

        const claims = tokens.claims() as MicrosoftClaims | undefined;
        if (!claims) {
          return res.status(400).send("No ID token claims returned");
        }

        const user = await provisionUser(claims);

        req.session.entraCodeVerifier = undefined;
        req.session.entraState = undefined;
        req.session.entraIdToken = tokens.id_token;
        req.session.user = {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        };

        res.redirect("/");
      } catch (err) {
        console.error("[auth] Microsoft callback failed:", err);
        res.status(500).send("Microsoft sign-in failed");
      }
    },
  );

  app.post(
    "/api/auth/microsoft/logout",
    async (req: Request, res: Response) => {
      try {
        const config = await getOidcConfig();
        const idTokenHint = req.session.entraIdToken;
        // Default the post-logout redirect to the configured redirect URI's
        // origin + /login. This avoids req.protocol returning "http" behind a
        // reverse proxy and producing an unregistered redirect.
        const postLogoutRedirect =
          entraConfig.postLogoutRedirectUri ||
          `${new URL(entraConfig.redirectUri).origin}/login`;

        await new Promise<void>((resolve) =>
          req.session.destroy(() => resolve()),
        );
        res.clearCookie("connect.sid");

        const endSessionUrl = client.buildEndSessionUrl(config, {
          post_logout_redirect_uri: postLogoutRedirect,
          ...(idTokenHint ? { id_token_hint: idTokenHint } : {}),
        });

        res.json({ logoutUrl: endSessionUrl.href });
      } catch (err) {
        console.error("[auth] Microsoft logout failed:", err);
        res.status(500).json({ message: "Failed to log out" });
      }
    },
  );
}
