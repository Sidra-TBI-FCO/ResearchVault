import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemeName = 'sidra' | 'hbku' | 'wcmq';

export interface InstitutionLabels {
  tier1: string;
  tier2: string;
  tier3: string;
  abbr1: string;
  abbr2: string;
  abbr3: string;
}

export interface InstitutionConfig {
  [key: string]: InstitutionLabels;
}

export const defaultInstitutionLabels: InstitutionConfig = {
  sidra: { tier1: 'Program', tier2: 'Project', tier3: 'Research Activity', abbr1: 'PRM', abbr2: 'PRJ', abbr3: 'SDR' },
  hbku: { tier1: 'Scientific Center', tier2: 'Laboratory', tier3: 'Project', abbr1: 'SC', abbr2: 'LAB', abbr3: 'PRJ' },
  wcmq: { tier1: 'Department', tier2: 'Research Program', tier3: 'Study', abbr1: 'DPT', abbr2: 'RP', abbr3: 'STD' }
};

interface ThemeContextType {
  mode: ThemeMode;
  themeName: ThemeName;
  institutionLabels: InstitutionConfig;
  currentLabels: InstitutionLabels;
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: ThemeName) => void;
  setInstitutionLabels: (labels: InstitutionConfig) => void;
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
  hbku: {
    name: 'Hamad Bin Khalifa University',
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
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
        800: '#3730a3',
        900: '#312e81',
      }
    }
  },
  wcmq: {
    name: 'Weill Cornell Medicine-Qatar',
    colors: {
      primary: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444', // Cornell red
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      secondary: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
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
    // Migrate old 'qbri' to 'hbku'
    if (stored === 'qbri') {
      localStorage.setItem('theme-name', 'hbku');
      return 'hbku';
    }
    return (stored as ThemeName) || 'sidra';
  });

  const [institutionLabels, setInstitutionLabels] = useState<InstitutionConfig>(() => {
    const stored = localStorage.getItem('institution-labels');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Deep merge: merge each institution's labels with defaults to add new fields
        const merged: InstitutionConfig = {};
        for (const key of Object.keys(defaultInstitutionLabels)) {
          merged[key] = {
            ...defaultInstitutionLabels[key],
            ...(parsed[key] || {})
          };
        }
        return merged;
      } catch {
        return defaultInstitutionLabels;
      }
    }
    return defaultInstitutionLabels;
  });

  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    localStorage.setItem('institution-labels', JSON.stringify(institutionLabels));
  }, [institutionLabels]);

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-name', themeName);
    
    // Apply theme to document
    const root = document.documentElement;
    const theme = themes[themeName];
    
    // Set data-theme attribute for CSS theme overrides
    root.setAttribute('data-theme', themeName);
    
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

  const currentLabels = institutionLabels[themeName] || defaultInstitutionLabels.sidra;

  const value = {
    mode,
    themeName,
    institutionLabels,
    currentLabels,
    setMode,
    setTheme,
    setInstitutionLabels,
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