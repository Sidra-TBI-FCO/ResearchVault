import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface PermissionWrapperProps {
  children: ReactNode;
  currentUserRole: string;
  navigationItem: string;
  fallback?: ReactNode;
  showReadOnlyBanner?: boolean;
}

export function PermissionWrapper({ 
  children, 
  currentUserRole, 
  navigationItem, 
  fallback = null,
  showReadOnlyBanner = true 
}: PermissionWrapperProps) {
  const { isHidden, isReadOnly } = usePermissions();

  // If the section is hidden, don't render anything
  if (isHidden(currentUserRole, navigationItem)) {
    return <>{fallback}</>;
  }

  // If it's read-only, wrap with read-only styling and banner
  if (isReadOnly(currentUserRole, navigationItem)) {
    return (
      <div className="space-y-4">
        {showReadOnlyBanner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">View Only Mode</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                Read Only
              </Badge>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              You have view-only access to this section. Contact an administrator to request edit permissions.
            </p>
          </div>
        )}
        <div className="read-only-content">
          {children}
        </div>
      </div>
    );
  }

  // Full access - render normally
  return <>{children}</>;
}

// Hook to check permissions for specific elements
export function useElementPermissions(currentUserRole: string, navigationItem: string) {
  const { isHidden, isReadOnly, canEdit } = usePermissions();

  return {
    isHidden: isHidden(currentUserRole, navigationItem),
    isReadOnly: isReadOnly(currentUserRole, navigationItem),
    canEdit: canEdit(currentUserRole, navigationItem),
    shouldHideEditButtons: !canEdit(currentUserRole, navigationItem),
    readOnlyClass: isReadOnly(currentUserRole, navigationItem) ? "read-only" : ""
  };
}