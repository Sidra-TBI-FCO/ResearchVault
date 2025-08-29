import { createContext, useContext, useState, ReactNode } from "react";

export type AccessLevel = "hide" | "view" | "edit";

export interface NavigationPermission {
  id: string;
  jobTitle: string;
  navigationItem: string;
  accessLevel: AccessLevel;
}

interface PermissionsContextType {
  permissions: NavigationPermission[];
  setPermissions: (permissions: NavigationPermission[]) => void;
  getAccessLevel: (jobTitle: string, navigationItem: string) => AccessLevel;
  canView: (jobTitle: string, navigationItem: string) => boolean;
  canEdit: (jobTitle: string, navigationItem: string) => boolean;
  isHidden: (jobTitle: string, navigationItem: string) => boolean;
  isReadOnly: (jobTitle: string, navigationItem: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const JOB_TITLES = [
  "Investigator",
  "Staff Scientist", 
  "Physician",
  "Research Scientist",
  "Lab Manager",
  "Postdoctoral Researcher",
  "PhD Student",
  "Management"
];

const NAVIGATION_ITEMS = [
  "dashboard", "scientists", "facilities", "programs", "projects", "research-activities",
  "irb-applications", "irb-office", "irb-reviewer", "ibc-applications", "ibc-office", 
  "ibc-reviewer", "data-management", "contracts", "publications", "patents", "reports"
];

const createDefaultPermissions = (): NavigationPermission[] => {
  const defaultPermissions: NavigationPermission[] = [];
  JOB_TITLES.forEach((jobTitle) => {
    NAVIGATION_ITEMS.forEach((navItem) => {
      // Set some realistic defaults for different roles
      let defaultAccess: AccessLevel = "edit";
      
      // Investigators have limited access to office/reviewer functions
      if (jobTitle === "Investigator") {
        if (navItem.includes("-office") || navItem.includes("-reviewer")) {
          defaultAccess = "hide";
        } else if (navItem === "reports") {
          defaultAccess = "view";
        }
      }
      
      // PhD Students have more restrictions
      if (jobTitle === "PhD Student") {
        if (navItem.includes("-office") || navItem.includes("-reviewer") || 
            navItem === "contracts" || navItem === "patents") {
          defaultAccess = "hide";
        } else if (navItem === "reports" || navItem === "programs") {
          defaultAccess = "view";
        }
      }
      
      defaultPermissions.push({
        id: `${jobTitle}-${navItem}`,
        jobTitle,
        navigationItem: navItem,
        accessLevel: defaultAccess
      });
    });
  });
  return defaultPermissions;
};

// Load permissions from localStorage or create defaults
const loadPersistedPermissions = (): NavigationPermission[] => {
  try {
    const saved = localStorage.getItem('rolePermissions');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the data structure
      if (Array.isArray(parsed) && parsed.every(p => 
        p.id && p.jobTitle && p.navigationItem && p.accessLevel
      )) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load permissions from localStorage:', error);
  }
  
  // Return defaults if nothing saved or error loading
  return createDefaultPermissions();
};

// Save permissions to localStorage
const savePermissionsToStorage = (permissions: NavigationPermission[]) => {
  try {
    localStorage.setItem('rolePermissions', JSON.stringify(permissions));
  } catch (error) {
    console.warn('Failed to save permissions to localStorage:', error);
  }
};

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<NavigationPermission[]>(() => loadPersistedPermissions());

  // Enhanced setPermissions that also saves to localStorage
  const setPermissionsWithPersistence = (newPermissions: NavigationPermission[]) => {
    setPermissions(newPermissions);
    savePermissionsToStorage(newPermissions);
  };

  const getAccessLevel = (jobTitle: string, navigationItem: string): AccessLevel => {
    const permission = permissions.find(p => 
      p.jobTitle === jobTitle && p.navigationItem === navigationItem
    );
    return permission?.accessLevel || "edit"; // Default to edit if not found
  };

  const canView = (jobTitle: string, navigationItem: string): boolean => {
    const accessLevel = getAccessLevel(jobTitle, navigationItem);
    return accessLevel === "view" || accessLevel === "edit";
  };

  const canEdit = (jobTitle: string, navigationItem: string): boolean => {
    const accessLevel = getAccessLevel(jobTitle, navigationItem);
    return accessLevel === "edit";
  };

  const isHidden = (jobTitle: string, navigationItem: string): boolean => {
    const accessLevel = getAccessLevel(jobTitle, navigationItem);
    return accessLevel === "hide";
  };

  const isReadOnly = (jobTitle: string, navigationItem: string): boolean => {
    const accessLevel = getAccessLevel(jobTitle, navigationItem);
    return accessLevel === "view";
  };

  return (
    <PermissionsContext.Provider value={{
      permissions,
      setPermissions: setPermissionsWithPersistence,
      getAccessLevel,
      canView,
      canEdit,
      isHidden,
      isReadOnly
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}