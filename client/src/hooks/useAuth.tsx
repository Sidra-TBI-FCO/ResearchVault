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

export interface AuthConfig {
  mode: 'demo' | 'local' | 'ldap' | 'oidc';
  oidcProviderName: string | null;
}

interface AuthContextType {
  user: User | null;
  authConfig: AuthConfig | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const [cfgRes, meRes] = await Promise.all([
          fetch('/api/auth/config'),
          fetch('/api/auth/me'),
        ]);

        if (cfgRes.ok) {
          const cfg: AuthConfig = await cfgRes.json();
          setAuthConfig(cfg);
        }

        if (meRes.ok) {
          const data = await meRes.json();
          setUser(data.user);
        }
      } catch {
        // fail silently — app will redirect to /login if unauthenticated
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
        toast({ title: 'Welcome back', description: data.user.name });
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

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      if (authConfig?.mode !== 'demo') navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfig,
        loading,
        login,
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

// Route guard — sends unauthenticated users to /login.
// In demo mode the server already injects a user, so /api/auth/me always succeeds.
export const RequireAuth: React.FC<{ children: ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading, authConfig } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (authConfig?.mode === 'demo') return; // demo always passes
    if (!isAuthenticated) navigate('/login');
    else if (adminOnly && !isAdmin) navigate('/');
  }, [isAuthenticated, isAdmin, loading, authConfig, navigate, adminOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (authConfig?.mode !== 'demo' && (!isAuthenticated || (adminOnly && !isAdmin))) {
    return null;
  }

  return <>{children}</>;
};
