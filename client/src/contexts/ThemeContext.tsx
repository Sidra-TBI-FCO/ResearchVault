import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemeName = 'sidra' | 'qbri';

interface ThemeContextType {
  mode: ThemeMode;
  themeName: ThemeName;
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: ThemeName) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes = {
  sidra: {
    name: 'Sidra Medicine',
    colors: {
      primary: {
        50: '#f0fdfa',
        100: '#ccfbf1', 
        200: '#99f6e4',
        300: '#5eead4',
        400: '#2dd4bf',
        500: '#14b8a6', // Main teal
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
      },
      secondary: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e', // Main green
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      }
    }
  },
  qbri: {
    name: 'Qatar Biomedical Research Institute',
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc', // Light cyan from logo
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7', // Medium blue from logo
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
      secondary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3', // Dark navy from logo
        900: '#312e81',
      }
    }
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || 'light';
  });
  
  const [themeName, setTheme] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('theme-name');
    return (stored as ThemeName) || 'sidra';
  });

  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-name', themeName);
    
    // Apply theme to document
    const root = document.documentElement;
    const theme = themes[themeName];
    
    // Set CSS custom properties for current theme
    Object.entries(theme.colors.primary).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color);
    });
    
    Object.entries(theme.colors.secondary).forEach(([shade, color]) => {
      root.style.setProperty(`--color-secondary-${shade}`, color);
    });
    
    // Set semantic color names for easy reference
    root.style.setProperty('--color-primary', theme.colors.primary[500]);
    root.style.setProperty('--color-primary-foreground', '#ffffff');
    root.style.setProperty('--color-secondary', theme.colors.secondary[500]);
    root.style.setProperty('--color-secondary-foreground', '#ffffff');
    
    // Dark mode handling
    if (mode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--color-background', '#0f172a');
      root.style.setProperty('--color-foreground', '#f1f5f9');
      root.style.setProperty('--color-card', '#1e293b');
      root.style.setProperty('--color-card-foreground', '#f1f5f9');
      root.style.setProperty('--color-muted', '#334155');
      root.style.setProperty('--color-muted-foreground', '#94a3b8');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--color-background', '#ffffff');
      root.style.setProperty('--color-foreground', '#0f172a');
      root.style.setProperty('--color-card', '#ffffff');
      root.style.setProperty('--color-card-foreground', '#0f172a');
      root.style.setProperty('--color-muted', '#f1f5f9');
      root.style.setProperty('--color-muted-foreground', '#64748b');
    }
  }, [mode, themeName]);

  const value = {
    mode,
    themeName,
    setMode,
    setTheme,
    toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themes };