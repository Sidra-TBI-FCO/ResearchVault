import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import session from "express-session";
import {
  getOidcConfig,
  isOidcConfigured,
  startOidcFlow,
  handleOidcCallback,
  buildOidcLogoutUrl,
} from "./authProviders/oidc";
import { authenticateLdap } from "./authProviders/ldap";

// ── Session types ────────────────────────────────────────────────────────────

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    // OIDC one-time values
    oidcState?: string;
    oidcNonce?: string;
    oidcCodeVerifier?: string;
    oidcIdToken?: string;
  }
}

// ── Auth mode ────────────────────────────────────────────────────────────────
// One unified auth system selectable via the AUTH_MODE env var:
//   local (default) | demo | ldap | oidc
// SSO (ldap/oidc) is OFF by default. With AUTH_MODE unset or "local"/"demo" the
// app behaves exactly as before (local login / role-emulation in development).

export type AuthMode = "demo" | "local" | "ldap" | "oidc";

export function getAuthMode(): AuthMode {
  const mode = (process.env.AUTH_MODE || "local").toLowerCase();
  if (mode === "demo" || mode === "ldap" || mode === "oidc") return mode;
  return "local";
}

// SSO is considered enabled only for the external identity-provider modes.
export function isSsoEnabled(): boolean {
  const mode = getAuthMode();
  return mode === "ldap" || mode === "oidc";
}

const DEFAULT_ROLE = process.env.AUTH_DEFAULT_ROLE || "Investigator";

// ── Password hashing ──────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// ── Middleware ────────────────────────────────────────────────────────────────

// Demo mode: auto-inject a configurable guest user for every request so the app
// is fully browsable without a login wall.
export function demoBannerMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.user) {
    req.session.user = {
      id: 0,
      username: process.env.DEMO_USERNAME || "demo.user",
      name: process.env.DEMO_NAME || "Demo User",
      email: process.env.DEMO_EMAIL || "demo@research.local",
      role: process.env.DEMO_ROLE || "Management",
    };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (getAuthMode() === "demo") return next(); // demo bypasses auth
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden. Admin access required." });
}

export function requireContractsOfficer(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.user?.role;
  if (role === "Contracts Officer" || role === "admin" || role === "Management") {
    return next();
  }
  res.status(403).json({ message: "Forbidden. Contracts officer access required." });
}

export function requireContractsRead(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    // Add user info to request for filtering in routes
    (req as any).currentUser = req.session.user;
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
}

// ── Provisioning ──────────────────────────────────────────────────────────────
// Provision (or look up) an external identity-provider user. External users are
// matched by stable subject id where available (OIDC `sub`, stored in the
// `entra_oid` column), falling back to email, then username. Provider fields are
// backfilled on existing rows and new users get the default role.

interface ExternalUserInput {
  provider: "ldap" | "oidc";
  subjectId?: string;
  username: string;
  name: string;
  email: string;
}

async function findOrCreateExternalUser(
  input: ExternalUserInput,
): Promise<SessionUser | null> {
  const email = (input.email || "").toLowerCase();

  let existing: typeof users.$inferSelect | undefined;

  if (input.subjectId) {
    [existing] = await db
      .select()
      .from(users)
      .where(eq(users.entraOid, input.subjectId))
      .limit(1);
  }

  if (!existing && email) {
    [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  }

  if (!existing) {
    [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);
  }

  if (existing) {
    // Backfill provider/subject id on the existing record when needed.
    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.subjectId && existing.entraOid !== input.subjectId) {
      patch.entraOid = input.subjectId;
    }
    if (existing.authProvider !== input.provider) {
      patch.authProvider = input.provider;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(users).set(patch).where(eq(users.id, existing.id));
    }
    const merged = { ...existing, ...patch };
    return {
      id: merged.id,
      username: merged.username,
      name: merged.name ?? input.username,
      email: merged.email ?? email,
      role: merged.role ?? DEFAULT_ROLE,
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      username: input.username,
      password: "", // unused for external-auth accounts
      name: input.name || input.username,
      email,
      role: DEFAULT_ROLE,
      authProvider: input.provider,
      entraOid: input.subjectId ?? null,
    })
    .returning();

  if (!created) return null;
  return {
    id: created.id,
    username: created.username,
    name: created.name,
    email: created.email,
    role: created.role,
  };
}

// ── Local login ───────────────────────────────────────────────────────────────

export async function loginUser(username: string, password: string) {
  try {
    const hashedPassword = hashPassword(password);
    const user = await db.select().from(users).where(eq(users.username, username));

    if (user.length === 0) {
      return { success: false, message: "User not found" };
    }

    const foundUser = user[0];
    if (foundUser.password !== hashedPassword) {
      return { success: false, message: "Invalid password" };
    }

    return {
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
      } as SessionUser,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "An error occurred during login" };
  }
}

// ── Startup logging ────────────────────────────────────────────────────────────

export function logAuthStatus() {
  const mode = getAuthMode();
  if (mode === "oidc") {
    const cfg = getOidcConfig();
    console.log(
      `[auth] SSO ENABLED — mode=oidc, provider=${cfg.providerName}, issuer=${cfg.issuerUrl || "(unset!)"}`,
    );
    if (!isOidcConfigured()) {
      console.warn(
        "[auth] AUTH_MODE=oidc but OIDC_ISSUER_URL/OIDC_CLIENT_ID are not set — sign-in will fail.",
      );
    }
  } else if (mode === "ldap") {
    console.log(`[auth] SSO ENABLED — mode=ldap, url=${process.env.LDAP_URL || "(unset!)"}`);
  } else if (mode === "demo") {
    console.log("[auth] SSO DISABLED — mode=demo (auto guest user, no login wall).");
  } else {
    console.log(
      "[auth] SSO DISABLED — mode=local (local login / role emulation). Set AUTH_MODE=ldap|oidc to enable SSO.",
    );
  }
}

// ── Route registration ─────────────────────────────────────────────────────────

export function registerAuthRoutes(app: any) {
  const mode = getAuthMode();

  // Public: auth configuration consumed by the client to render the correct UI.
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    const oidcName = mode === "oidc" ? getOidcConfig().providerName : null;
    res.json({
      mode,
      ssoEnabled: isSsoEnabled(),
      provider: mode,
      providerName: oidcName,
    });
  });

  // Current user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Login (local + ldap share the same username/password endpoint).
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    if (mode === "oidc") {
      return res.status(403).json({
        message: "Local login is disabled. Please sign in via SSO.",
      });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    if (mode === "ldap") {
      const result = await authenticateLdap(username, password);
      if (!result.success || !result.user) {
        return res.status(401).json({ message: result.message || "Invalid credentials" });
      }
      const sessionUser = await findOrCreateExternalUser({
        provider: "ldap",
        username: result.user.username,
        name: result.user.name,
        email: result.user.email,
      });
      if (!sessionUser) {
        return res.status(500).json({ message: "Failed to create user session" });
      }
      req.session.user = sessionUser;
      return res.json({ user: sessionUser });
    }

    // local / demo
    const result = await loginUser(username, password);
    if (result.success && result.user) {
      req.session.user = result.user;
      return res.json({ user: result.user });
    }
    return res.status(401).json({ message: result.message });
  });

  // OIDC flow (only registered when in oidc mode).
  if (mode === "oidc") {
    app.get("/api/auth/oidc", async (req: Request, res: Response) => {
      try {
        await startOidcFlow(req, res);
      } catch (err) {
        console.error("[auth] OIDC start error:", err);
        res.status(500).send("Failed to start SSO login");
      }
    });

    app.get("/api/auth/callback", async (req: Request, res: Response) => {
      try {
        const result = await handleOidcCallback(req);
        if (!result.success || !result.user) {
          return res.redirect(
            `/login?error=${encodeURIComponent(result.message || "Login failed")}`,
          );
        }
        const sessionUser = await findOrCreateExternalUser({
          provider: "oidc",
          subjectId: result.user.subjectId,
          username: result.user.username,
          name: result.user.name,
          email: result.user.email,
        });
        if (!sessionUser) {
          return res.redirect("/login?error=session_error");
        }
        req.session.oidcIdToken = result.idToken;
        req.session.user = sessionUser;
        res.redirect("/");
      } catch (err) {
        console.error("[auth] OIDC callback error:", err);
        res.redirect("/login?error=callback_error");
      }
    });
  }

  // Logout (all modes). For OIDC, return the IdP end-session URL so the client
  // can redirect the browser to fully sign out at the provider.
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (mode === "demo") {
      return res.json({ message: "Demo mode — logout is a no-op" });
    }

    if (mode === "oidc") {
      try {
        const idTokenHint = req.session.oidcIdToken;
        let logoutUrl: string | undefined;
        try {
          logoutUrl = await buildOidcLogoutUrl(idTokenHint);
        } catch (e) {
          console.error("[auth] OIDC logout URL build failed:", e);
        }
        await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully", logoutUrl });
      } catch (err) {
        console.error("[auth] OIDC logout failed:", err);
        return res.status(500).json({ message: "Failed to log out" });
      }
    }

    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });
}
