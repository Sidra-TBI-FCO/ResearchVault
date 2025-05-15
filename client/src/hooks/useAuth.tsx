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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        // Fail silently, user is not authenticated
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        toast({
          title: 'Login successful',
          description: `Welcome back, ${data.user.name}!`,
        });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: 'Login failed',
          description: errorData.message || 'Invalid username or password',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Login error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
      navigate('/login');
      toast({
        title: 'Logout successful',
        description: 'You have been logged out.',
      });
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Route guard component to protect routes
export const RequireAuth: React.FC<{ children: ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [, navigate] = useNavigate();
  
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (adminOnly && !isAdmin) {
        navigate('/');
      }
    }
  }, [isAuthenticated, isAdmin, loading, navigate, adminOnly]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return null;
  }
  
  return <>{children}</>;
};