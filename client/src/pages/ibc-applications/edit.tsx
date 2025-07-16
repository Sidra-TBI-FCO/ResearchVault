import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIbcApplicationSchema, type InsertIbcApplication, type IbcApplication, type ResearchActivity, type Scientist } from "@shared/schema";
import { ArrowLeft, Loader2, Beaker, User, X, Users, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React from "react";
import { z } from "zod";

// Extended schema for edit form including team management
const editIbcApplicationSchema = insertIbcApplicationSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  principalInvestigatorId: z.number({
    required_error: "Please select a principal investigator",
  }),
  researchActivityIds: z.array(z.number()).min(1, "Please select at least one research activity"),
  teamMembers: z.array(z.union([
    z.object({
      scientistId: z.number(),
      role: z.enum(["team_member", "team_leader", "safety_representative"]),
    }),
    z.object({
      name: z.string(),
      email: z.string().optional(),
      role: z.string(),
    })
  ])).default([]),
});

type EditIbcApplicationFormValues = z.infer<typeof editIbcApplicationSchema>;

export default function IbcApplicationEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for team member selection
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: ibcApplication, isLoading } = useQuery<IbcApplication>({
    queryKey: ['/api/ibc-applications', id],
    queryFn: () => fetch(`/api/ibc-applications/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  // Get all principal investigators for selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  // Fetch associated research activities for this IBC application
  const { data: associatedActivities } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/ibc-applications', id, 'research-activities'],
    queryFn: () => fetch(`/api/ibc-applications/${id}/research-activities`).then(res => res.json()),
    enabled: !!id,
  });

  const form = useForm<EditIbcApplicationFormValues>({
    resolver: zodResolver(editIbcApplicationSchema),
    defaultValues: {
      researchActivityId: ibcApplication?.researchActivityId || 0,
      ibcNumber: ibcApplication?.ibcNumber || "",
      cayuseProtocolNumber: ibcApplication?.cayuseProtocolNumber || "",
      title: ibcApplication?.title || "",
      shortTitle: ibcApplication?.shortTitle || "",
      principalInvestigatorId: ibcApplication?.principalInvestigatorId || 0,


      biosafetyLevel: ibcApplication?.biosafetyLevel || "BSL-2",
      riskGroupClassification: ibcApplication?.riskGroupClassification || "",
      materialAndMethods: ibcApplication?.materialAndMethods || "",
      proceduresInvolvingInfectiousAgents: ibcApplication?.proceduresInvolvingInfectiousAgents || "",
      cellCultureProcedures: ibcApplication?.cellCultureProcedures || "",
      nucleicAcidExtractionMethods: ibcApplication?.nucleicAcidExtractionMethods || "",
      animalProcedures: ibcApplication?.animalProcedures || "",
      containmentProcedures: ibcApplication?.containmentProcedures || "",
      emergencyProcedures: ibcApplication?.emergencyProcedures || "",
      wasteDisposalPlan: ibcApplication?.wasteDisposalPlan || "",
      recombinantDNA: ibcApplication?.recombinantDNA || false,
      humanMaterials: ibcApplication?.humanMaterials || false,
      animalWork: ibcApplication?.animalWork || false,
      fieldWork: ibcApplication?.fieldWork || false,
      researchActivityIds: associatedActivities?.map(ra => ra.id) || [],
      teamMembers: [],
    },
  });

  const selectedPIId = form.watch('principalInvestigatorId');
  const selectedSDRIds = form.watch('researchActivityIds') || [];

  // Get research activities filtered by selected PI, plus any already associated activities
  const { data: researchActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities', selectedPIId, associatedActivities?.map(a => a.id).join(',')],
    queryFn: async () => {
      if (!selectedPIId) return associatedActivities || [];
      
      // Get activities for the selected PI
      const response = await fetch(`/api/research-activities?principalInvestigatorId=${selectedPIId}`);
      if (!response.ok) throw new Error('Failed to fetch research activities');
      const piActivities = await response.json();
      
      // Merge with associated activities (remove duplicates)
      const associatedIds = associatedActivities?.map(a => a.id) || [];
      const allActivities = [...piActivities];
      
      // Add associated activities that aren't already in the PI's list
      if (associatedActivities) {
        for (const associated of associatedActivities) {
          if (!piActivities.some((pa: ResearchActivity) => pa.id === associated.id)) {
            allActivities.push(associated);
          }
        }
      }
      
      return allActivities;
    },
    enabled: !!selectedPIId || !!associatedActivities,
  });

  // Get staff from selected SDRs for team member selection  
  const { data: availableStaff, isLoading: staffLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/research-activities/staff', selectedSDRIds],
    queryFn: async () => {
      if (!selectedSDRIds.length) return [];
      const staffPromises = selectedSDRIds.map(async (sdrId) => {
        const response = await fetch(`/api/research-activities/${sdrId}/staff`);
        if (!response.ok) return [];
        return response.json();
      });
      const staffArrays = await Promise.all(staffPromises);
      const allStaff = staffArrays.flat();
      
      // Remove duplicates and exclude the PI
      const uniqueStaff = allStaff.filter((staff, index, arr) => 
        arr.findIndex(s => s.id === staff.id) === index && 
        staff.id !== selectedPIId
      );
      
      return uniqueStaff;
    },
    enabled: selectedSDRIds.length > 0,
  });

  // Update form when IBC application data loads
  React.useEffect(() => {
    if (ibcApplication && associatedActivities) {
      const selectedActivityIds = associatedActivities.map(ra => ra.id);
      
      // Parse existing team members from the protocolTeamMembers field
      let existingTeamMembers = [];
      try {
        if (ibcApplication.protocolTeamMembers && typeof ibcApplication.protocolTeamMembers === 'string') {
          existingTeamMembers = JSON.parse(ibcApplication.protocolTeamMembers);
        } else if (Array.isArray(ibcApplication.protocolTeamMembers)) {
          existingTeamMembers = ibcApplication.protocolTeamMembers;
        }
      } catch (error) {
        console.error('Error parsing existing team members:', error);
        existingTeamMembers = [];
      }
      
      form.reset({
        researchActivityId: ibcApplication.researchActivityId || 0,
        ibcNumber: ibcApplication.ibcNumber,
        cayuseProtocolNumber: ibcApplication.cayuseProtocolNumber || "",
        title: ibcApplication.title,
        shortTitle: ibcApplication.shortTitle || "",
        principalInvestigatorId: ibcApplication.principalInvestigatorId,


        biosafetyLevel: ibcApplication.biosafetyLevel || "BSL-2",
        riskGroupClassification: ibcApplication.riskGroupClassification || "",
        materialAndMethods: ibcApplication.materialAndMethods || "",
        proceduresInvolvingInfectiousAgents: ibcApplication.proceduresInvolvingInfectiousAgents || "",
        cellCultureProcedures: ibcApplication.cellCultureProcedures || "",
        nucleicAcidExtractionMethods: ibcApplication.nucleicAcidExtractionMethods || "",
        animalProcedures: ibcApplication.animalProcedures || "",
        containmentProcedures: ibcApplication.containmentProcedures || "",
        emergencyProcedures: ibcApplication.emergencyProcedures || "",
        wasteDisposalPlan: ibcApplication.wasteDisposalPlan || "",
        recombinantDNA: ibcApplication.recombinantDNA || false,
        humanMaterials: ibcApplication.humanMaterials || false,
        animalWork: ibcApplication.animalWork || false,
        fieldWork: ibcApplication.fieldWork || false,
        researchActivityIds: selectedActivityIds,
        teamMembers: existingTeamMembers,
      });
    }
  }, [ibcApplication, associatedActivities, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('saveMutation.mutationFn called');
      console.log('Sending PATCH request to save:', `/api/ibc-applications/${id}`);
      console.log('Request data:', data);
      
      try {
        const result = await apiRequest("PATCH", `/api/ibc-applications/${id}`, { ...data, isDraft: true });
        console.log('API request completed successfully:', result);
        return result;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Save mutation onSuccess called with result:', result);
      toast({
        title: "Saved",
        description: "IBC application saved as draft successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
    },
    onError: (error: any) => {
      console.error('Save mutation onError called with error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save IBC application",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Sending PATCH request to submit:', `/api/ibc-applications/${id}`);
      console.log('Request data:', data);
      return apiRequest("PATCH", `/api/ibc-applications/${id}`, { ...data, isDraft: false });
    },
    onSuccess: (result) => {
      console.log('Submit successful:', result);
      toast({
        title: "Success",
        description: "IBC application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
      navigate(`/ibc-applications/${id}`);
    },
    onError: (error: any) => {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit IBC application",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (data: EditIbcApplicationFormValues) => {
    console.log('handleSave called with data:', data);
    console.log('Form validation state:', form.formState.isValid);
    console.log('Form errors:', form.formState.errors);
    
    // Remove the team members array and research activity IDs since they're handled separately
    const { teamMembers, researchActivityIds, ...ibcData } = data;
    
    // Convert team members to JSON format for storage
    const protocolTeamMembers = JSON.stringify(teamMembers);
    
    console.log('Save payload:', { ...ibcData, protocolTeamMembers });
    console.log('About to call saveMutation.mutateAsync');
    
    return await saveMutation.mutateAsync({ ...ibcData, protocolTeamMembers });
  };

  const handleSubmit = async (data: EditIbcApplicationFormValues) => {
    console.log('Form submit data:', data);
    
    // Remove the team members array and research activity IDs since they're handled separately
    const { teamMembers, researchActivityIds, ...ibcData } = data;
    
    // Convert team members to JSON format for storage
    const protocolTeamMembers = JSON.stringify(teamMembers);
    
    console.log('Submit payload:', { ...ibcData, protocolTeamMembers });
    console.log('About to call submitMutation.mutateAsync');
    
    return await submitMutation.mutateAsync({ ...ibcData, protocolTeamMembers });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ibc-applications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ibcApplication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ibc-applications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">IBC Application Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The IBC application you're trying to edit could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/ibc-applications")}>
                Return to IBC Applications List
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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/ibc-applications/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Edit IBC Application</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IBC Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <FormField
                control={form.control}
                name="principalInvestigatorId"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Principal Investigator</FormLabel>
                    <FormDescription>
                      Select the PI first to filter related research activities
                    </FormDescription>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        // Clear selected research activities when PI changes
                        form.setValue('researchActivityIds', []);
                      }}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Principal Investigator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {piLoading ? (
                          <SelectItem value="loading" disabled>Loading PIs...</SelectItem>
                        ) : (
                          principalInvestigators?.map((pi) => (
                            <SelectItem key={pi.id} value={pi.id.toString()}>
                              {pi.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="researchActivityIds"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Research Activities (SDRs)</FormLabel>
                    <FormDescription>
                      Select one or more research activities that share biosafety protocols
                    </FormDescription>
                    <div className="space-y-2">
                      {!selectedPIId ? (
                        <div className="text-sm text-muted-foreground italic">
                          Please select a Principal Investigator first to see available research activities
                        </div>
                      ) : activitiesLoading ? (
                        <div className="text-sm text-muted-foreground">Loading research activities...</div>
                      ) : researchActivities && researchActivities.length > 0 ? (
                        researchActivities.map((activity) => (
                          <div key={activity.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`sdr-${activity.id}`}
                              checked={field.value?.includes(activity.id) || false}
                              onChange={(e) => {
                                const currentValues = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...currentValues, activity.id]);
                                } else {
                                  field.onChange(currentValues.filter(id => id !== activity.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`sdr-${activity.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {activity.sdrNumber} - {activity.title}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          No research activities available for the selected PI
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Protocol Team Members Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Protocol Team Members
                  </CardTitle>
                  <CardDescription>
                    Add team members from available SDR staff who will be involved in this protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Team Member Section */}
                  {selectedSDRIds.length > 0 && availableStaff?.length ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Add Protocol Team Member</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Select SDR Team Member</label>
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose from SDR team members..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableStaff.map((staff) => {
                                  const currentTeamMembers = form.watch('teamMembers') || [];
                                  const isAlreadySelected = currentTeamMembers.some(member => member.scientistId === staff.id);
                                  return (
                                    <SelectItem 
                                      key={staff.id} 
                                      value={staff.id.toString()}
                                      disabled={isAlreadySelected}
                                    >
                                      {staff.name} - {staff.title}
                                      {isAlreadySelected && " (Already added)"}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Protocol Roles (Select Multiple)
                            </label>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              {[
                                "Team Member",
                                "Team Leader", 
                                "Safety Rep"
                              ].map((role) => (
                                <div key={role} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={role.toLowerCase().replace(/\s+/g, '-')}
                                    checked={selectedRoles.includes(role)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedRoles([...selectedRoles, role]);
                                      } else {
                                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                                      }
                                    }}
                                  />
                                  <label htmlFor={role.toLowerCase().replace(/\s+/g, '-')}>{role}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              type="button" 
                              size="sm" 
                              className="bg-teal-600 hover:bg-teal-700"
                              disabled={!selectedMember || selectedRoles.length === 0}
                              onClick={() => {
                                if (selectedMember && selectedRoles.length > 0) {
                                  const currentMembers = form.getValues('teamMembers') || [];
                                  form.setValue('teamMembers', [
                                    ...currentMembers,
                                    { scientistId: parseInt(selectedMember), role: 'team_member' as const }
                                  ]);
                                  setSelectedMember("");
                                  setSelectedRoles([]);
                                }
                              }}
                            >
                              Add Member
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedMember("");
                                setSelectedRoles([]);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      {selectedSDRIds.length === 0 
                        ? "Select research activities above to add team members from their staff"
                        : staffLoading 
                        ? "Loading available staff..."
                        : "No additional staff found in the selected research activities"
                      }
                    </div>
                  )}

                  {/* Added Team Members List */}
                  <div className="space-y-3">
                    {form.watch('teamMembers')?.map((member, index) => {
                      // Handle both new format (with scientistId) and existing format (with name, email, role)
                      let memberName, memberEmail, memberRole;
                      
                      if (member.scientistId) {
                        // New format - look up in available staff
                        const staff = availableStaff?.find(s => s.id === member.scientistId);
                        if (!staff) return null;
                        memberName = staff.name;
                        memberEmail = staff.email;
                        memberRole = member.role;
                      } else if (member.name) {
                        // Existing format - use stored values directly
                        memberName = member.name;
                        memberEmail = member.email;
                        memberRole = member.role;
                      } else {
                        return null;
                      }
                      
                      return (
                        <div key={`${member.scientistId || member.name}-${index}`} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{memberName}</div>
                            <div className="text-sm text-gray-600">{memberEmail}</div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="secondary" className="text-xs">{memberRole}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                const currentMembers = form.getValues('teamMembers') || [];
                                form.setValue('teamMembers', 
                                  currentMembers.filter((_, i) => i !== index)
                                );
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!form.watch('teamMembers') || form.watch('teamMembers')?.length === 0) && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No team members added yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="ibcNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBC Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., IBC-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cayuseProtocolNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cayuse Protocol Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Cayuse protocol number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="IBC application title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Short recognition title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="biosafetyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biosafety Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select biosafety level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BSL-1">BSL-1</SelectItem>
                        <SelectItem value="BSL-2">BSL-2</SelectItem>
                        <SelectItem value="BSL-3">BSL-3</SelectItem>
                        <SelectItem value="BSL-4">BSL-4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskGroupClassification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Group Classification</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Risk Group 1">Risk Group 1 - No or low risk</SelectItem>
                        <SelectItem value="Risk Group 2">Risk Group 2 - Moderate risk</SelectItem>
                        <SelectItem value="Risk Group 3">Risk Group 3 - High risk</SelectItem>
                        <SelectItem value="Risk Group 4">Risk Group 4 - Extreme danger</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="recombinantDNA"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Recombinant DNA</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="humanMaterials"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Human Materials</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="animalWork"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Animal Work</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fieldWork"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="rounded border-gray-300"
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Field Work</FormLabel>
                    </FormItem>
                  )}
                />
              </div>





              {/* Methods and Procedures Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Methods and Procedures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="materialAndMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materials and Methods</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the detailed experimental protocols, materials, and methodologies..."
                            className="resize-none"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="proceduresInvolvingInfectiousAgents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedures Involving Infectious Agents</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any procedures involving infectious agents..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cellCultureProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cell Culture Procedures</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe cell culture techniques, cell lines used..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nucleicAcidExtractionMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nucleic Acid Extraction Methods</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe DNA/RNA extraction and purification protocols..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="animalProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Animal Procedures (if applicable)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any animal procedures, including routes of administration..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Safety and Containment Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Safety and Containment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="containmentProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Containment Procedures</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe containment procedures and safety measures..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Procedures</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe emergency response procedures..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wasteDisposalPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waste Disposal Plan</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe waste sterilization and disposal procedures..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>





              <div className="flex gap-4">
                <Button 
                  type="button" 
                  disabled={saveMutation.isPending || submitMutation.isPending}
                  variant="outline"
                  onClick={async () => {
                    // Show immediate feedback
                    toast({
                      title: "Save clicked",
                      description: "Processing save request...",
                    });
                    
                    console.log('Save button clicked');
                    console.log('Current form values:', form.getValues());
                    console.log('Form validation state:', form.formState.isValid);
                    console.log('Form errors:', form.formState.errors);
                    
                    // Get current form data
                    const formData = form.getValues();
                    
                    // Call handleSave directly with form data
                    try {
                      await handleSave(formData);
                    } catch (error) {
                      console.error('Error in handleSave:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save: " + (error as Error).message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Button 
                  type="button" 
                  disabled={saveMutation.isPending || submitMutation.isPending}
                  className="bg-sidra-teal hover:bg-sidra-teal-dark text-white"
                  onClick={async () => {
                    // Show immediate feedback
                    toast({
                      title: "Submit clicked",
                      description: "Processing submission...",
                    });
                    
                    console.log('Submit button clicked');
                    console.log('Current form values:', form.getValues());
                    
                    // Get current form data
                    const formData = form.getValues();
                    
                    // Call handleSubmit directly with form data
                    try {
                      await handleSubmit(formData);
                    } catch (error) {
                      console.error('Error in handleSubmit:', error);
                      toast({
                        title: "Error",
                        description: "Failed to submit: " + (error as Error).message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/ibc-applications/${id}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}