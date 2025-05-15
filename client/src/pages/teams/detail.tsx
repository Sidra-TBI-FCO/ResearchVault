import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  UserPlus,
  UserMinus,
  ClipboardList,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ResearchActivity, Scientist, ProjectMember } from "@/lib/types";

interface TeamDetailProps {
  researchActivityId?: number;
}

export default function TeamDetail(props: TeamDetailProps) {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Use the provided id or the one from URL params
  const id = props.researchActivityId || parseInt(params.id);
  
  const [open, setOpen] = useState(false);
  const [selectedScientistId, setSelectedScientistId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  // Fetch research activity details
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/research-activities", id],
  });
  
  // Fetch team members
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery({
    queryKey: ["/api/projects", id, "members"],
    enabled: !!id,
  });
  
  // Fetch all scientists for the team member selection
  const { data: scientists, isLoading: scientistsLoading } = useQuery({
    queryKey: ["/api/scientists"],
  });
  
  // Filter out scientists who are already team members
  const availableScientists = scientists
    ? scientists.filter(
        (scientist: Scientist) =>
          !teamMembers?.some(
            (member: ProjectMember) => member.scientistId === scientist.id
          )
      )
    : [];
  
  // Add team member mutation
  const addTeamMember = useMutation({
    mutationFn: async (data: { scientistId: number; role: string }) => {
      return apiRequest(`/api/projects/${id}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      setSelectedScientistId(null);
      setSelectedRole("");
      setOpen(false);
      toast({
        title: "Team member added",
        description: "The team member has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add team member: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove team member mutation
  const removeTeamMember = useMutation({
    mutationFn: async (scientistId: number) => {
      return apiRequest(`/api/projects/${id}/members/${scientistId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "members"] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove team member: " + error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddTeamMember = () => {
    if (!selectedScientistId || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select a scientist and a role.",
        variant: "destructive",
      });
      return;
    }
    
    addTeamMember.mutate({
      scientistId: selectedScientistId,
      role: selectedRole,
    });
  };
  
  const handleRemoveTeamMember = (scientistId: number) => {
    if (window.confirm("Are you sure you want to remove this team member?")) {
      removeTeamMember.mutate(scientistId);
    }
  };
  
  // If the page is loaded directly (not through a research activity)
  if (activityLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/research-activities")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Team Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">
                The research team you're looking for could not be found.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/research-activities")}
              >
                Return to Research Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/research-activities/${activity.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Research Activity
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Research Team</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a scientist or staff member to the research team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="scientist">Scientist</Label>
                <Select
                  value={selectedScientistId?.toString() || ""}
                  onValueChange={(value) => setSelectedScientistId(parseInt(value))}
                >
                  <SelectTrigger id="scientist">
                    <SelectValue placeholder="Select scientist" />
                  </SelectTrigger>
                  <SelectContent>
                    {scientistsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading scientists...
                      </SelectItem>
                    ) : availableScientists.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No available scientists
                      </SelectItem>
                    ) : (
                      availableScientists.map((scientist: Scientist) => (
                        <SelectItem
                          key={scientist.id}
                          value={scientist.id.toString()}
                        >
                          {scientist.name} {scientist.staffId ? 
                            <Badge variant="outline" className="ml-2 text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                              {scientist.staffId}
                            </Badge> : null
                          }
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Team Role Assignment</Label>
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select team role" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Only SDR Team Roles */}
                    <SelectItem value="Principal Investigator">Principal Investigator</SelectItem>
                    <SelectItem value="Lead Scientist">Lead Scientist</SelectItem>
                    <SelectItem value="Team Member">Team Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddTeamMember}
                disabled={!selectedScientistId || !selectedRole || addTeamMember.isPending}
              >
                {addTeamMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Team for {activity.title}
            <Badge variant="outline" className="ml-2 font-mono bg-blue-50 text-blue-700 border-blue-200">
              {activity.sdrNumber}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage the research team members and assign team roles (Principal Investigator, Lead Scientist, Team Member).
            Note: Job titles (like Staff Scientist) are set in the staff member profile and are separate from team roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="mx-auto h-12 w-12 text-neutral-300" />
              <h3 className="mt-4 text-lg font-semibold">No Team Members</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Add team members to this research activity to get started.
              </p>
              <Button
                className="mt-4"
                onClick={() => setOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Team Role</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Staff ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member: ProjectMember) => {
                    // Find the scientist details from the scientists list
                    const scientist = scientists?.find(s => s.id === member.scientistId) || null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="font-medium">{scientist?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {scientist?.email || 'No email available'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            member.role === 'Principal Investigator' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            member.role === 'Lead Scientist' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            'bg-green-100 text-green-800 border-green-200'
                          }>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{scientist?.title || 'N/A'}</TableCell>
                        <TableCell>
                          {scientist?.staffId ? (
                            <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                              {scientist.staffId}
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTeamMember(member.scientistId)}
                            disabled={removeTeamMember.isPending}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}