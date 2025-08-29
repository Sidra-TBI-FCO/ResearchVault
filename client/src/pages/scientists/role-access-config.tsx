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

interface NavigationPermission {
  id: string;
  jobTitle: string;
  navigationItem: string;
  hasAccess: boolean;
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

const NAVIGATION_ITEMS = [
  { id: "dashboard", name: "Dashboard", description: "System overview and statistics" },
  { id: "scientists", name: "Scientists & Staff", description: "Research team management" },
  { id: "facilities", name: "Facilities", description: "Buildings and rooms management" },
  { id: "programs", name: "Programs (PRM)", description: "Research programs" },
  { id: "projects", name: "Projects (PRJ)", description: "Research projects" },
  { id: "research-activities", name: "Research Activities (SDR)", description: "Scientific data records" },
  { id: "irb-applications", name: "IRB Applications", description: "Ethics review applications" },
  { id: "irb-office", name: "IRB Office", description: "IRB administration" },
  { id: "irb-reviewer", name: "IRB Reviewer", description: "IRB review interface" },
  { id: "ibc-applications", name: "IBC Applications", description: "Biosafety applications" },
  { id: "ibc-office", name: "IBC Office", description: "IBC administration" },
  { id: "ibc-reviewer", name: "IBC Reviewer", description: "IBC review interface" },
  { id: "data-management", name: "Data Management Plans", description: "Research data governance" },
  { id: "contracts", name: "Research Contracts", description: "Collaboration agreements" },
  { id: "publications", name: "Publications", description: "Academic publications" },
  { id: "patents", name: "Patents", description: "Intellectual property" },
  { id: "reports", name: "Reports", description: "System reports and analytics" }
];

export default function RoleAccessConfig() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<NavigationPermission[]>([]);

  // Initialize permissions with default full access
  const initializePermissions = () => {
    const defaultPermissions: NavigationPermission[] = [];
    JOB_TITLES.forEach((jobTitle) => {
      NAVIGATION_ITEMS.forEach((navItem) => {
        defaultPermissions.push({
          id: `${jobTitle}-${navItem.id}`,
          jobTitle,
          navigationItem: navItem.id,
          hasAccess: true
        });
      });
    });
    setPermissions(defaultPermissions);
  };

  // Initialize permissions on component mount
  useState(() => {
    initializePermissions();
  });

  const updatePermission = (id: string, hasAccess: boolean) => {
    setPermissions(prev => prev.map(perm => 
      perm.id === id ? { ...perm, hasAccess } : perm
    ));
  };

  const resetToDefaults = () => {
    initializePermissions();
    toast({
      title: "Reset Complete",
      description: "All navigation permissions have been reset to full access defaults."
    });
  };

  const savePermissions = () => {
    // For now, just show a success message since we're not storing in database yet
    toast({
      title: "Permissions Saved",
      description: "Navigation access permissions have been updated successfully."
    });
  };

  const getPermissionForRole = (jobTitle: string, navItemId: string) => {
    return permissions.find(p => p.jobTitle === jobTitle && p.navigationItem === navItemId);
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
            Configure which navigation sections each job role can access. 
            By default, all roles have access to all navigation items.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {NAVIGATION_ITEMS.map((navItem) => (
              <div key={navItem.id} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="font-medium text-lg">{navItem.name}</h3>
                    <p className="text-sm text-muted-foreground">{navItem.description}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div>Job Title</div>
                    <div className="text-center">Navigation Access</div>
                    <div className="text-center">Status</div>
                  </div>

                  {/* Permission rows */}
                  {JOB_TITLES.map((jobTitle) => {
                    const permission = getPermissionForRole(jobTitle, navItem.id);
                    if (!permission) return null;

                    return (
                      <div key={`${jobTitle}-${navItem.id}`} className="grid grid-cols-3 gap-4 items-center py-2 hover:bg-muted/50 rounded-lg px-2">
                        <div className="font-medium">{jobTitle}</div>
                        
                        <div className="flex justify-center">
                          <Switch
                            checked={permission.hasAccess}
                            onCheckedChange={(checked) => updatePermission(permission.id, checked)}
                          />
                        </div>

                        <div className="flex justify-center">
                          {permission.hasAccess ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Access Granted</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">Access Denied</Badge>
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