import { Client } from "ldapts";

export interface LdapAuthResult {
  success: boolean;
  message?: string;
  user?: { username: string; name: string; email: string };
}

function getLdapConfig() {
  return {
    url: process.env.LDAP_URL || "ldap://localhost:389",
    bindDN: process.env.LDAP_BIND_DN || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD || "",
    searchBase: process.env.LDAP_SEARCH_BASE || "",
    // Use {{username}} as placeholder, e.g. (sAMAccountName={{username}})
    searchFilter: process.env.LDAP_SEARCH_FILTER || "(uid={{username}})",
    usernameField: process.env.LDAP_USER_FIELD_USERNAME || "uid",
    nameField: process.env.LDAP_USER_FIELD_NAME || "cn",
    emailField: process.env.LDAP_USER_FIELD_EMAIL || "mail",
    tlsEnabled: process.env.LDAP_TLS === "true",
    tlsRejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== "false",
  };
}

export function isLdapConfigured(): boolean {
  return Boolean(process.env.LDAP_URL && process.env.LDAP_BIND_DN && process.env.LDAP_SEARCH_BASE);
}

export async function authenticateLdap(
  username: string,
  password: string,
): Promise<LdapAuthResult> {
  const cfg = getLdapConfig();

  const client = new Client({
    url: cfg.url,
    tlsOptions: cfg.tlsEnabled
      ? { rejectUnauthorized: cfg.tlsRejectUnauthorized }
      : undefined,
  });

  try {
    // Bind with the service account to search for the user
    if (!cfg.bindDN) {
      return { success: false, message: "LDAP_BIND_DN is not configured" };
    }
    await client.bind(cfg.bindDN, cfg.bindPassword);

    // Search for the user entry
    const filter = cfg.searchFilter.replace(/\{\{username\}\}/g, username);
    const { searchEntries } = await client.search(cfg.searchBase, {
      filter,
      attributes: ["dn", cfg.usernameField, cfg.nameField, cfg.emailField],
    });

    if (searchEntries.length === 0) {
      return { success: false, message: "User not found" };
    }

    const entry = searchEntries[0];
    const userDN = entry.dn;

    // Unbind service account, then re-bind as the user to verify password
    await client.unbind();

    const userClient = new Client({
      url: cfg.url,
      tlsOptions: cfg.tlsEnabled
        ? { rejectUnauthorized: cfg.tlsRejectUnauthorized }
        : undefined,
    });
    try {
      await userClient.bind(userDN, password);
    } catch {
      return { success: false, message: "Invalid credentials" };
    } finally {
      try {
        await userClient.unbind();
      } catch {}
    }

    const name = String(entry[cfg.nameField] ?? username);
    const email = String(entry[cfg.emailField] ?? "");

    return { success: true, user: { username, name, email } };
  } catch (err) {
    console.error("[auth] LDAP error:", err);
    return { success: false, message: "LDAP authentication error" };
  } finally {
    try {
      await client.unbind();
    } catch {}
  }
}
