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
      defaultPermissions.push({
        id: `${jobTitle}-${navItem}`,
        jobTitle,
        navigationItem: navItem,
        accessLevel: "edit" // Default to full access
      });
    });
  });
  return defaultPermissions;
};

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<NavigationPermission[]>(() => createDefaultPermissions());

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
      setPermissions,
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