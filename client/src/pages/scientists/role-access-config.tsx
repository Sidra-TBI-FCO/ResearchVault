import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, RotateCcw, Eye, EyeOff, Edit, ArrowUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, type AccessLevel, type NavigationPermission } from "@/hooks/usePermissions";

const JOB_TITLES = [
  "Investigator",
  "Staff Scientist", 
  "Physician",
  "Research Specialist",
  "Research Associate",
  "Research Assistant",
  "Lab Manager",
  "Postdoctoral Researcher",
  "PhD Student",
  "Management",
  "IRB Board Member",
  "IBC Board Member", 
  "PMO Officer",
  "IRB Officer",
  "IBC Officer",
  "Outcome Officer"
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
  { id: "outcome-office", name: "Outcome Office", description: "Research outcomes and impact tracking" },
  { id: "patents", name: "Patents", description: "Intellectual property" },
  { id: "reports", name: "Reports", description: "System reports and analytics" }
];

export default function RoleAccessConfig() {
  const { toast } = useToast();
  const { permissions, setPermissions, getAccessLevel } = usePermissions();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const scrollToTop = () => {
    // Find the scrollable main content container
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Fallback to window scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updatePermission = (id: string, accessLevel: AccessLevel) => {
    setPermissions(permissions.map(perm => 
      perm.id === id ? { ...perm, accessLevel } : perm
    ));
  };

  const resetToDefaults = () => {
    const defaultPermissions: NavigationPermission[] = [];
    JOB_TITLES.forEach((jobTitle) => {
      NAVIGATION_ITEMS.forEach((navItem) => {
        defaultPermissions.push({
          id: `${jobTitle}-${navItem.id}`,
          jobTitle,
          navigationItem: navItem.id,
          accessLevel: "edit"
        });
      });
    });
    setPermissions(defaultPermissions);
    toast({
      title: "Reset Complete",
      description: "All navigation permissions have been reset to Edit (full access) defaults."
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
            Configure navigation access levels for each job role: Hide (not visible), View Only (read-only), or Full Access (can edit). 
            By default, all roles have Full Access to all navigation items.
          </p>
        </CardHeader>
        
        {/* Quick Navigation */}
        <div className="border-b px-6 py-4">
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">Quick Navigation</h3>
          <div className="flex flex-wrap gap-2">
            {NAVIGATION_ITEMS.map((navItem) => (
              <Button
                key={navItem.id}
                variant="outline"
                size="sm"
                onClick={() => scrollToSection(navItem.id)}
                className="text-xs h-7"
              >
                {navItem.name}
              </Button>
            ))}
          </div>
        </div>
        <CardContent>
          <div className="space-y-6">
            {NAVIGATION_ITEMS.map((navItem) => (
              <div key={navItem.id} id={`section-${navItem.id}`} className="space-y-3 scroll-mt-4">
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
                    <div className="text-center">Access Level</div>
                    <div className="text-center">Status</div>
                  </div>

                  {/* Permission rows */}
                  {JOB_TITLES.map((jobTitle) => {
                    const permission = getPermissionForRole(jobTitle, navItem.id);
                    if (!permission) return null;

                    const getStatusBadge = (accessLevel: AccessLevel) => {
                      switch (accessLevel) {
                        case "hide":
                          return (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Hidden
                            </Badge>
                          );
                        case "view":
                          return (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              View Only
                            </Badge>
                          );
                        case "edit":
                          return (
                            <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
                              <Edit className="h-3 w-3" />
                              Full Access
                            </Badge>
                          );
                      }
                    };

                    return (
                      <div key={`${jobTitle}-${navItem.id}`} className="grid grid-cols-3 gap-4 items-center py-2 hover:bg-muted/50 rounded-lg px-2">
                        <div className="font-medium">{jobTitle}</div>
                        
                        <div className="flex justify-center">
                          <RadioGroup
                            value={permission.accessLevel}
                            onValueChange={(value) => updatePermission(permission.id, value as AccessLevel)}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="hide" id={`${permission.id}-hide`} />
                              <Label htmlFor={`${permission.id}-hide`} className="flex items-center gap-1 text-xs cursor-pointer">
                                <EyeOff className="h-3 w-3" />
                                Hide
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="view" id={`${permission.id}-view`} />
                              <Label htmlFor={`${permission.id}-view`} className="flex items-center gap-1 text-xs cursor-pointer">
                                <Eye className="h-3 w-3" />
                                View
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="edit" id={`${permission.id}-edit`} />
                              <Label htmlFor={`${permission.id}-edit`} className="flex items-center gap-1 text-xs cursor-pointer">
                                <Edit className="h-3 w-3" />
                                Edit
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="flex justify-center">
                          {getStatusBadge(permission.accessLevel)}
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
      
      {/* Floating Back to Top Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={scrollToTop}
          className="rounded-full h-12 w-12 shadow-lg"
          size="icon"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}