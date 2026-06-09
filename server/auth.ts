import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { type Request, type Response, type NextFunction } from "express";
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
    oidcState?: string;
    oidcNonce?: string;
  }
}

// ── Auth mode ──────────────────────────────────────────────────────────────────

export type AuthMode = "demo" | "local" | "ldap" | "oidc";

export function getAuthMode(): AuthMode {
  const mode = (process.env.AUTH_MODE || "local").toLowerCase();
  if (mode === "demo" || mode === "ldap" || mode === "oidc") return mode;
  return "local";
}

export function isSsoEnabled(): boolean {
  return getAuthMode() === "oidc";
}

export function logAuthStatus(): void {
  const mode = getAuthMode();
  const sso = isSsoEnabled();
  console.log(`[auth] mode=${mode} sso=${sso}`);
}

// ── Password hashing ───────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// ── Middleware ─────────────────────────────────────────────────────────────────

// Demo mode: auto-inject a configurable guest user for every request
export function demoBannerMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.user) {
    req.session.user = {
      id: 0,
      username: process.env.DEMO_USERNAME || "demo.user",
      name: process.env.DEMO_NAME || "Demo User",
      email: process.env.DEMO_EMAIL || "demo@researchvault.local",
      role: process.env.DEMO_ROLE || "Management",
    };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (getAuthMode() === "demo") return next(); // demo bypasses auth
  if (req.session?.user) return next();
  res.status(401).json({ message: "Unauthorized. Please log in." });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user?.role === "admin") return next();
  res.status(403).json({ message: "Forbidden. Admin access required." });
}

export function requireContractsOfficer(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.user?.role;
  if (role === "Contracts Officer" || role === "admin" || role === "Management") return next();
  res.status(403).json({ message: "Forbidden. Contracts officer access required." });
}

export function requireContractsRead(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user) {
    (req as any).currentUser = req.session.user;
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Please log in." });
}

// ── Local auth helpers ─────────────────────────────────────────────────────────

async function findOrCreateExternalUser(
  username: string,
  name: string,
  email: string,
): Promise<SessionUser | null> {
  let [user] = await db.select().from(users).where(eq(users.username, username));

  if (!user) {
    // Create a new user record for external-auth users (no password)
    const [created] = await db
      .insert(users)
      .values({ username, name, email, password: "", role: "Investigator" })
      .returning();
    user = created;
  }

  if (!user) return null;
  return { id: user.id, username: user.username, name: user.name ?? username, email: user.email ?? email, role: user.role ?? "Investigator" };
}

// ── Route registration ─────────────────────────────────────────────────────────

export function registerAuthRoutes(app: any) {
  const mode = getAuthMode();

  // Public: returns auth configuration so the client can adapt the UI
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    const { getOidcConfig } = require("./authProviders/oidc");
    const oidcCfg = mode === "oidc" ? getOidcConfig() : null;
    res.json({
      mode,
      oidcProviderName: oidcCfg?.providerName ?? null,
    });
  });

  // Current user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.session?.user) return res.json({ user: req.session.user });
    res.status(401).json({ message: "Not authenticated" });
  });

  // ── Login (local + ldap share the same endpoint) ──
  if (mode === "local" || mode === "ldap") {
    app.post("/api/auth/login", async (req: Request, res: Response) => {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      let sessionUser: SessionUser | null = null;

      if (mode === "local") {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username));

        if (!user || user.password !== hashPassword(password)) {
          return res.status(401).json({ message: "Invalid username or password" });
        }
        sessionUser = { id: user.id, username: user.username, name: user.name ?? username, email: user.email ?? "", role: user.role ?? "Investigator" };

      } else {
        // LDAP
        const { authenticateLdap } = await import("./authProviders/ldap");
        const result = await authenticateLdap(username, password);
        if (!result.success || !result.user) {
          return res.status(401).json({ message: result.message || "Invalid credentials" });
        }
        sessionUser = await findOrCreateExternalUser(
          result.user.username,
          result.user.name,
          result.user.email,
        );
        if (!sessionUser) {
          return res.status(500).json({ message: "Failed to create user session" });
        }
      }

      req.session.user = sessionUser;
      return res.json({ user: sessionUser });
    });
  }

  // ── OIDC flow ──
  if (mode === "oidc") {
    app.get("/api/auth/oidc", async (req: Request, res: Response) => {
      try {
        const { startOidcFlow } = await import("./authProviders/oidc");
        await startOidcFlow(req, res);
      } catch (err) {
        console.error("OIDC start error:", err);
        res.status(500).json({ message: "Failed to start SSO login" });
      }
    });

    app.get("/api/auth/callback", async (req: Request, res: Response) => {
      try {
        const { handleOidcCallback } = await import("./authProviders/oidc");
        const result = await handleOidcCallback(req);
        if (!result.success || !result.user) {
          return res.redirect(`/login?error=${encodeURIComponent(result.message || "Login failed")}`);
        }

        const sessionUser = await findOrCreateExternalUser(
          result.user.username,
          result.user.name,
          result.user.email,
        );
        if (!sessionUser) {
          return res.redirect("/login?error=session_error");
        }

        req.session.user = sessionUser;
        res.redirect("/");
      } catch (err) {
        console.error("OIDC callback error:", err);
        res.redirect("/login?error=callback_error");
      }
    });
  }

  // Logout (all modes)
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (mode === "demo") {
      return res.json({ message: "Demo mode — logout is a no-op" });
    }
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "Failed to log out" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
}
