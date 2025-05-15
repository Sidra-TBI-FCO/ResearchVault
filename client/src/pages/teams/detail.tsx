import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ResearchActivity, Scientist, ProjectMember } from "@shared/schema";
import { ArrowLeft, UserPlus, UserMinus, User, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function TeamDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedScientistId, setSelectedScientistId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Fetch the research activity details
  const { data: researchActivity, isLoading: isLoadingActivity } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', id],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch the team members for this research activity
  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useQuery<ProjectMember[]>({
    queryKey: ['/api/research-activities', id, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch all scientists for the dropdown
  const { data: scientists, isLoading: isLoadingScientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: async () => {
      const response = await fetch('/api/scientists');
      if (!response.ok) {
        throw new Error('Failed to fetch scientists');
      }
      return response.json();
    },
  });

  // Add team member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (newMember: { researchActivityId: number; scientistId: number; role: string }) => {
      const response = await fetch(`/api/research-activities/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add team member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
      setAddMemberOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/research-activities', id, 'members'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ researchActivityId, scientistId }: { researchActivityId: number; scientistId: number }) => {
      const response = await fetch(`/api/research-activities/${researchActivityId}/members/${scientistId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove team member');
      }
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/research-activities', id, 'members'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddMember = () => {
    if (!selectedScientistId || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a team member and role',
        variant: 'destructive',
      });
      return;
    }

    addMemberMutation.mutate({
      researchActivityId: id,
      scientistId: parseInt(selectedScientistId),
      role: selectedRole,
    });
  };

  const handleRemoveMember = (scientistId: number) => {
    removeMemberMutation.mutate({
      researchActivityId: id,
      scientistId,
    });
  };

  const getScientistById = (scientistId: number) => {
    return scientists?.find(s => s.id === scientistId);
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      'pi': 'Principal Investigator',
      'co-pi': 'Co-Principal Investigator',
      'researcher': 'Researcher',
      'post-doc': 'Post-doctoral Fellow',
      'phd-student': 'PhD Student',
      'technician': 'Lab Technician',
      'specialist': 'Research Specialist',
      'assistant': 'Research Assistant',
    };
    return roles[role] || role;
  };

  if (isLoadingActivity || isLoadingTeamMembers || isLoadingScientists) {
    return (
      <div className="container mx-auto py-10">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate('/teams')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-8 w-1/2" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-1/3" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Get team lead (PI) info
  const teamLead = researchActivity?.leadPIId 
    ? getScientistById(researchActivity.leadPIId)
    : null;

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/teams')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span>{researchActivity?.title}</span>
                </CardTitle>
                <CardDescription className="mt-2">
                  <Badge variant="outline" className="font-mono">
                    {researchActivity?.sdrNumber}
                  </Badge>
                  <Badge variant={researchActivity?.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                    {researchActivity?.status}
                  </Badge>
                </CardDescription>
              </div>
              
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Select a team member and assign a role for this research activity.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="scientist" className="text-right">
                        Team Member
                      </Label>
                      <Select 
                        value={selectedScientistId || ''} 
                        onValueChange={setSelectedScientistId}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {scientists?.map((scientist) => (
                            <SelectItem key={scientist.id} value={scientist.id.toString()}>
                              {scientist.name} 
                              {scientist.staffId && (
                                <span className="ml-2 text-muted-foreground">
                                  ({scientist.staffId})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Role
                      </Label>
                      <Select
                        value={selectedRole || ''}
                        onValueChange={setSelectedRole}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pi">Principal Investigator</SelectItem>
                          <SelectItem value="co-pi">Co-Principal Investigator</SelectItem>
                          <SelectItem value="researcher">Researcher</SelectItem>
                          <SelectItem value="post-doc">Post-doctoral Fellow</SelectItem>
                          <SelectItem value="phd-student">PhD Student</SelectItem>
                          <SelectItem value="technician">Lab Technician</SelectItem>
                          <SelectItem value="specialist">Research Specialist</SelectItem>
                          <SelectItem value="assistant">Research Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={handleAddMember}
                      disabled={addMemberMutation.isPending}
                    >
                      {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Team Lead Info Card */}
            {teamLead && (
              <Card className="mb-6 bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Team Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {teamLead.profileImageInitials || teamLead.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium">{teamLead.name}</h3>
                      <p className="text-sm text-muted-foreground">{teamLead.title}</p>
                      {teamLead.staffId && (
                        <Badge variant="secondary" className="mt-1 bg-blue-100 hover:bg-blue-100">
                          {teamLead.staffId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Team Members Table */}
            <Table>
              <TableCaption>Team members for {researchActivity?.title}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers && teamMembers.length > 0 ? (
                  teamMembers.map((member) => {
                    const scientist = getScientistById(member.scientistId);
                    if (!scientist) return null;
                    
                    return (
                      <TableRow key={`${member.researchActivityId}-${member.scientistId}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {scientist.profileImageInitials || scientist.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {scientist.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {scientist.staffId ? (
                            <Badge variant="secondary" className="bg-blue-100 hover:bg-blue-100">
                              {scientist.staffId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getRoleLabel(member.role || '')}
                          </Badge>
                        </TableCell>
                        <TableCell>{scientist.department || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(scientist.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No team members added yet. Click "Add Team Member" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}