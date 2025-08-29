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
  availableUsers: User[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUser: (userId: number) => Promise<boolean>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Check if user is authenticated and load available users
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check current user
        const authResponse = await fetch('/api/auth/me');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setUser(authData.user);
        }
        
        // Load available users for switching
        const usersResponse = await fetch('/api/auth/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setAvailableUsers(usersData.users);
        }
      } catch (error) {
        // Fail silently, user is not authenticated or users can't be loaded
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
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
      await fetch('/api/auth/logout', {
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

  // Switch user function (for development/testing)
  const switchUser = async (userId: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/switch-user', {
        method: 'POST',
        body: JSON.stringify({ userId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        toast({
          title: 'User switched',
          description: `Now viewing as ${data.user.name}`,
        });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: 'Switch user failed',
          description: errorData.message || 'Failed to switch user',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Switch user error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        availableUsers,
        login,
        logout,
        switchUser,
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
  const [, navigate] = useLocation();
  
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