import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scientist, insertScientistSchema, ResearchActivity, Project, Program, ProjectMember } from "@shared/schema";
import { ArrowLeft, Mail, Phone, Building, Calendar, User, Pencil, Save, X, ChevronRight, ChevronDown, Folder, FileText, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PublicationsList } from "@/components/PublicationsList";
import { PublicationCharts } from "@/components/PublicationCharts";

// Tree structure component for research activities
interface ResearchActivitiesTreeProps {
  activities: (ResearchActivity & { project?: Project; program?: Program; memberRole?: string })[];
  navigate: (path: string) => void;
}

function ResearchActivitiesTree({ activities, navigate }: ResearchActivitiesTreeProps) {
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Group activities by program, then by project
  const groupedActivities = activities.reduce((acc, activity) => {
    const programId = activity.program?.id || 0; // 0 for "No Program"
    const projectId = activity.project?.id || 0; // 0 for "No Project"
    
    if (!acc[programId]) {
      acc[programId] = {
        program: activity.program || { id: 0, name: "No Program", programId: "NONE", description: null, createdAt: null, updatedAt: null },
        projects: {}
      };
    }
    
    if (!acc[programId].projects[projectId]) {
      acc[programId].projects[projectId] = {
        project: activity.project || { id: 0, name: "No Project", projectId: "NONE", programId: null, description: null, createdAt: null, updatedAt: null, principalInvestigatorId: null },
        activities: []
      };
    }
    
    acc[programId].projects[projectId].activities.push(activity);
    return acc;
  }, {} as Record<number, { program: Program; projects: Record<number, { project: Project; activities: typeof activities }> }>);

  const toggleProgram = (programId: number) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  return (
    <div className="space-y-1">
      {Object.entries(groupedActivities).map(([programId, { program, projects }]) => (
        <div key={programId} className="space-y-1">
          <Collapsible 
            open={expandedPrograms.has(Number(programId))}
            onOpenChange={() => toggleProgram(Number(programId))}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 hover:bg-neutral-50 rounded-md">
              {expandedPrograms.has(Number(programId)) ? (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
              <Folder className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">
                {program.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {Object.values(projects).reduce((sum, proj) => sum + proj.activities.length, 0)}
              </Badge>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="ml-6 space-y-1">
              {Object.entries(projects).map(([projectId, { project, activities: projectActivities }]) => (
                <div key={projectId} className="space-y-1">
                  <Collapsible
                    open={expandedProjects.has(Number(projectId))}
                    onOpenChange={() => toggleProject(Number(projectId))}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 hover:bg-neutral-50 rounded-md">
                      {expandedProjects.has(Number(projectId)) ? (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                      )}
                      <Building className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {project.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {projectActivities.length}
                      </Badge>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="ml-6 space-y-1">
                      {projectActivities.map((activity) => (
                        <Button
                          key={activity.id}
                          variant="ghost"
                          className="flex items-center gap-2 w-full justify-start p-2 h-auto text-left"
                          onClick={() => navigate(`/research-activities/${activity.id}`)}
                        >
                          <FileText className="h-4 w-4 text-purple-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {activity.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <Badge variant="outline" className="text-xs font-mono">
                                {activity.sdrNumber}
                              </Badge>
                              {activity.memberRole && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.memberRole}
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${
                                activity.status === 'active' ? 'bg-green-50 text-green-700' :
                                activity.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                                'bg-yellow-50 text-yellow-700'
                              }`}>
                                {activity.status}
                              </Badge>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      ))}
    </div>
  );
}

export default function ScientistDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scientist, isLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', id],
    queryFn: async () => {
      const response = await fetch(`/api/scientists/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scientist');
      }
      return response.json();
    },
  });

  // Fetch scientist's research activities
  const { data: scientistActivities, isLoading: activitiesLoading } = useQuery<(ResearchActivity & { project?: Project; program?: Program; memberRole?: string })[]>({
    queryKey: ['/api/scientists', id, 'research-activities'],
    queryFn: async () => {
      const response = await fetch(`/api/scientists/${id}/research-activities`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activities');
      }
      return response.json();
    },
    enabled: !!id,
  });
  
  const updateMutation = useMutation({
    mutationFn: async (updateData: Partial<Scientist>) => {
      const response = await fetch(`/api/scientists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update scientist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scientists', id] });
      setEditMode(false);
      toast({
        title: "Success",
        description: "Scientist details updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during update",
        variant: "destructive",
      });
    }
  });
  
  const form = useForm<Partial<Scientist>>({
    resolver: zodResolver(insertScientistSchema.partial()),
    defaultValues: {
      name: scientist?.name || '',
      title: scientist?.title || '',
      email: scientist?.email || '',
      phoneNumber: scientist?.phoneNumber || '',
      department: scientist?.department || '',
      expertise: scientist?.expertise || '',
      staffId: scientist?.staffId || '',
      bio: scientist?.bio || '',
      isStaff: scientist?.isStaff || false,
    },
  });
  
  // Update form values when scientist data changes
  React.useEffect(() => {
    if (scientist) {
      form.reset({
        name: scientist.name,
        title: scientist.title,
        email: scientist.email,
        phoneNumber: scientist.phoneNumber,
        department: scientist.department,
        expertise: scientist.expertise,
        staffId: scientist.staffId,
        bio: scientist.bio,
        isStaff: scientist.isStaff,
      });
    }
  }, [scientist, form]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
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
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scientist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Scientist Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The scientist you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/scientists")}>
                Return to Scientists List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">{scientist.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile and Publications */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Personal and contact information</CardDescription>
              </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditMode(!editMode)}
              className="ml-auto"
            >
              {editMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => updateMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select job title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Staff Scientist">Staff Scientist</SelectItem>
                              <SelectItem value="Investigator">Investigator</SelectItem>
                              <SelectItem value="Research Specialist">Research Specialist</SelectItem>
                              <SelectItem value="Research Assistant">Research Assistant</SelectItem>
                              <SelectItem value="Research Associate">Research Associate</SelectItem>
                              <SelectItem value="PhD Student">PhD Student</SelectItem>
                              <SelectItem value="Post-doctoral Fellow">Post-doctoral Fellow</SelectItem>
                              <SelectItem value="Lab Manager">Lab Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the job title for this scientist or staff member
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Email address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Department" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="staffId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Staff ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Staff ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biography</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                            placeholder="Professional biography"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <>
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24 text-lg">
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {scientist.profileImageInitials || scientist.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {scientist.name}
                        {scientist.staffId && (
                          <Badge variant="outline" className="ml-3 rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                            ID: {scientist.staffId}
                          </Badge>
                        )}
                      </h2>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-neutral-500 mr-2">Job Title:</div>
                        <p className="text-neutral-700">
                          {scientist.title || (scientist.isStaff ? "Research Staff" : "Investigator")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {scientist.isStaff ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Staff</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Principal Investigator</Badge>
                      )}
                      {scientist.department && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{scientist.department}</Badge>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      {scientist.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <a href={`mailto:${scientist.email}`} className="text-primary-600 hover:underline">
                            {scientist.email}
                          </a>
                        </div>
                      )}
                      {scientist.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-neutral-400" />
                          <a href={`tel:${scientist.phoneNumber}`} className="text-primary-600 hover:underline">
                            {scientist.phoneNumber}
                          </a>
                        </div>
                      )}
                      {scientist.department && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-neutral-400" />
                          <span>{scientist.department}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {scientist.bio && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Biography</h3>
                    <p className="text-neutral-600">{scientist.bio}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Publications List */}
        <PublicationsList scientistId={id} yearsSince={5} />
        </div>

        {/* Right Column - Research Activities and Publication Charts */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Research Activities</CardTitle>
              <CardDescription>Organized by program and project</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : !scientistActivities || scientistActivities.length === 0 ? (
                <p className="text-neutral-400 text-sm">No research activities found.</p>
              ) : (
                <ResearchActivitiesTree 
                  activities={scientistActivities} 
                  navigate={navigate}
                />
              )}
            </CardContent>
          </Card>

          {/* Publication Charts and Statistics */}
          <PublicationCharts scientistId={id} yearsSince={5} />
        </div>
      </div>
    </div>
  );
}