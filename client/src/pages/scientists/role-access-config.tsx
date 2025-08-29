import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Permission {
  id: string;
  jobTitle: string;
  module: string;
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

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

const APPLICATION_MODULES = [
  { id: "dashboard", name: "Dashboard", description: "View system overview and statistics" },
  { id: "scientists", name: "Scientists & Staff", description: "Manage research team members" },
  { id: "programs", name: "Programs (PRM)", description: "Manage research programs" },
  { id: "projects", name: "Projects (PRJ)", description: "Manage research projects" },
  { id: "research-activities", name: "Research Activities (SDR)", description: "Manage scientific data records" },
  { id: "publications", name: "Publications", description: "Manage academic publications" },
  { id: "patents", name: "Patents", description: "Manage intellectual property" },
  { id: "irb-applications", name: "IRB Applications", description: "Institutional Review Board applications" },
  { id: "ibc-applications", name: "IBC Applications", description: "Institutional Biosafety Committee applications" },
  { id: "data-management", name: "Data Management Plans", description: "Research data governance" },
  { id: "contracts", name: "Research Contracts", description: "Collaboration and funding agreements" }
];

export default function RoleAccessConfig() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Initialize permissions with default full access
  const initializePermissions = () => {
    const defaultPermissions: Permission[] = [];
    JOB_TITLES.forEach((jobTitle) => {
      APPLICATION_MODULES.forEach((module) => {
        defaultPermissions.push({
          id: `${jobTitle}-${module.id}`,
          jobTitle,
          module: module.id,
          canView: true,
          canEdit: true,
          canCreate: true,
          canDelete: true
        });
      });
    });
    setPermissions(defaultPermissions);
  };

  // Initialize permissions on component mount
  useState(() => {
    initializePermissions();
  });

  const updatePermission = (id: string, field: keyof Permission, value: boolean) => {
    setPermissions(prev => prev.map(perm => 
      perm.id === id ? { ...perm, [field]: value } : perm
    ));
  };

  const resetToDefaults = () => {
    initializePermissions();
    toast({
      title: "Reset Complete",
      description: "All permissions have been reset to full access defaults."
    });
  };

  const savePermissions = () => {
    // For now, just show a success message since we're not storing in database yet
    toast({
      title: "Permissions Saved",
      description: "Role-based access permissions have been updated successfully."
    });
  };

  const getPermissionForRole = (jobTitle: string, moduleId: string) => {
    return permissions.find(p => p.jobTitle === jobTitle && p.module === moduleId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/scientists">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scientists
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-400">Configure Role Based Access</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={savePermissions}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure what each job role can access and do within the system. 
            By default, all roles have full access to all modules.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {APPLICATION_MODULES.map((module) => (
              <div key={module.id} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-medium text-lg">{module.name}</h3>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Header */}
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div>Job Title</div>
                    <div className="text-center">View</div>
                    <div className="text-center">Edit</div>
                    <div className="text-center">Create</div>
                    <div className="text-center">Delete</div>
                    <div className="text-center">Status</div>
                  </div>

                  {/* Permission rows */}
                  {JOB_TITLES.map((jobTitle) => {
                    const permission = getPermissionForRole(jobTitle, module.id);
                    if (!permission) return null;

                    const hasFullAccess = permission.canView && permission.canEdit && permission.canCreate && permission.canDelete;
                    const hasPartialAccess = permission.canView || permission.canEdit || permission.canCreate || permission.canDelete;

                    return (
                      <div key={`${jobTitle}-${module.id}`} className="grid grid-cols-6 gap-4 items-center py-2 hover:bg-muted/50 rounded-lg px-2">
                        <div className="font-medium">{jobTitle}</div>
                        
                        <div className="flex justify-center">
                          <Switch
                            checked={permission.canView}
                            onCheckedChange={(checked) => updatePermission(permission.id, 'canView', checked)}
                          />
                        </div>
                        
                        <div className="flex justify-center">
                          <Switch
                            checked={permission.canEdit}
                            onCheckedChange={(checked) => updatePermission(permission.id, 'canEdit', checked)}
                          />
                        </div>
                        
                        <div className="flex justify-center">
                          <Switch
                            checked={permission.canCreate}
                            onCheckedChange={(checked) => updatePermission(permission.id, 'canCreate', checked)}
                          />
                        </div>
                        
                        <div className="flex justify-center">
                          <Switch
                            checked={permission.canDelete}
                            onCheckedChange={(checked) => updatePermission(permission.id, 'canDelete', checked)}
                          />
                        </div>

                        <div className="flex justify-center">
                          {hasFullAccess ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Full Access</Badge>
                          ) : hasPartialAccess ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial Access</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">No Access</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}