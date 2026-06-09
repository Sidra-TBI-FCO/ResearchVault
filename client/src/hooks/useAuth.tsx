import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export type AuthMode = 'demo' | 'local' | 'ldap' | 'oidc';

export interface AuthConfig {
  // Active auth mode (server-controlled via the AUTH_MODE env var).
  mode: AuthMode;
  // True only for the external identity-provider modes (ldap/oidc).
  ssoEnabled: boolean;
  // Provider identifier (mirrors `mode`); kept for existing consumers.
  provider: string;
  // Display name for the SSO button (e.g. "Microsoft"), null when not OIDC.
  providerName: string | null;
}

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  mode: 'local',
  ssoEnabled: false,
  provider: 'local',
  providerName: null,
};

interface AuthContextType {
  user: User | null;
  authConfig: AuthConfig;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithSso: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const configResponse = await fetch('/api/auth/config');
        if (configResponse.ok) {
          setAuthConfig({ ...DEFAULT_AUTH_CONFIG, ...(await configResponse.json()) });
        }

        const authResponse = await fetch('/api/auth/me');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setUser(authData.user);
        }
      } catch (error) {
        // Fail silently — the app will redirect to /login if unauthenticated.
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        toast({ title: 'Login successful', description: `Welcome back, ${data.user.name}!` });
        return true;
      } else {
        const err = await response.json();
        toast({ title: 'Sign in failed', description: err.message || 'Invalid credentials', variant: 'destructive' });
        return false;
      }
    } catch {
      toast({ title: 'Sign in error', description: 'An unexpected error occurred.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Redirect the browser to start the OIDC (SSO) login flow.
  const loginWithSso = () => {
    window.location.href = '/api/auth/oidc';
  };

  const logout = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);

      // OIDC logout may return an end-session URL to fully sign out at the IdP.
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data?.logoutUrl) {
          window.location.href = data.logoutUrl;
          return;
        }
      }

      // Always return to the landing page — login is a modal there now
      navigate('/');
      toast({ title: 'Signed out', description: 'You have been signed out successfully.' });
    } catch (error) {
      toast({
        title: 'Logout error',
        description: 'An error occurred during logout.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        loading,
        login,
        loginWithSso,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const RequireAuth: React.FC<{ children: ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading, authConfig } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/');
      } else if (adminOnly && !isAdmin) {
        navigate('/');
      }
    }
  }, [isAuthenticated, isAdmin, loading, navigate, adminOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
};
