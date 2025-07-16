import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIbcApplicationSchema, type InsertIbcApplication, type IbcApplication, type ResearchActivity, type Scientist } from "@shared/schema";
import { ArrowLeft, Loader2, Beaker, User, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  teamMembers: z.array(z.object({
    scientistId: z.number(),
    role: z.enum(["team_member", "team_leader", "safety_representative"]),
  })).default([]),
});

type EditIbcApplicationFormValues = z.infer<typeof editIbcApplicationSchema>;

export default function IbcApplicationEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      status: ibcApplication?.status || "Submitted",
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

  // Get research activities filtered by selected PI
  const { data: researchActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId) return [];
      const response = await fetch(`/api/research-activities?principalInvestigatorId=${selectedPIId}`);
      if (!response.ok) throw new Error('Failed to fetch research activities');
      return response.json();
    },
    enabled: !!selectedPIId,
  });

  // Get team members from selected SDRs
  const { data: availableTeamMembers, isLoading: teamMembersLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/team-members', ...selectedSDRIds],
    queryFn: async () => {
      if (selectedSDRIds.length === 0) return [];
      
      const allStaff: Scientist[] = [];
      for (const sdrId of selectedSDRIds) {
        const response = await fetch(`/api/research-activities/${sdrId}/members`);
        if (response.ok) {
          const members = await response.json();
          allStaff.push(...members.map((m: any) => m.scientist));
        }
      }
      
      // Remove duplicates and exclude the selected PI
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
      form.reset({
        researchActivityId: ibcApplication.researchActivityId || 0,
        ibcNumber: ibcApplication.ibcNumber,
        cayuseProtocolNumber: ibcApplication.cayuseProtocolNumber || "",
        title: ibcApplication.title,
        shortTitle: ibcApplication.shortTitle || "",
        principalInvestigatorId: ibcApplication.principalInvestigatorId,

        status: ibcApplication.status,
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
        researchActivityIds: associatedActivities?.map(ra => ra.id) || [],
        teamMembers: [],
      });
    }
  }, [ibcApplication, associatedActivities, form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PATCH", `/api/ibc-applications/${id}`, {
        ibcApplication: {
          ...data.ibcApplication,

        },
        researchActivityIds: data.researchActivityIds,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IBC application updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
      navigate(`/ibc-applications/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update IBC application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditIbcApplicationFormValues) => {
    // Remove the team members array and research activity IDs since they're handled separately
    const { teamMembers, researchActivityIds, ...ibcData } = data;
    
    updateMutation.mutate({
      ...ibcData,
      ibcApplication: ibcData,
      researchActivityIds,
    } as any);
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Team Members Section */}
              <FormField
                control={form.control}
                name="teamMembers"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Team Members</FormLabel>
                    <FormDescription>
                      Select team members from the research activities and assign roles
                    </FormDescription>
                    <div className="space-y-4">
                      {/* Display current team members */}
                      {field.value && field.value.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Current Team:</h4>
                          {field.value.map((member, index) => {
                            const scientist = availableTeamMembers?.find(s => s.id === member.scientistId);
                            return (
                              <div key={`${member.scientistId}-${index}`} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">{scientist?.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {member.role.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newMembers = field.value?.filter((_, i) => i !== index) || [];
                                    field.onChange(newMembers);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add team members */}
                      {selectedSDRIds.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Available Team Members:</h4>
                          {teamMembersLoading ? (
                            <div className="text-sm text-muted-foreground">Loading team members...</div>
                          ) : availableTeamMembers && availableTeamMembers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                              {availableTeamMembers
                                .filter(member => !field.value?.some(tm => tm.scientistId === member.id))
                                .map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm">{member.name}</span>
                                    {member.department && (
                                      <span className="text-xs text-gray-500">({member.department})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      onValueChange={(role) => {
                                        const currentMembers = field.value || [];
                                        field.onChange([
                                          ...currentMembers,
                                          { scientistId: member.id, role: role as any }
                                        ]);
                                      }}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="team_member">Team Member</SelectItem>
                                        <SelectItem value="team_leader">Team Leader</SelectItem>
                                        <SelectItem value="safety_representative">Safety Rep</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              No additional team members available from selected research activities
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="principalInvestigatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Investigator</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select principal investigator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Note: We'd need scientists data here, but keeping simple for now */}
                        <SelectItem value="1">Dr. Emily Chen</SelectItem>
                        <SelectItem value="2">Dr. Michael Johnson</SelectItem>
                        <SelectItem value="3">Dr. Sarah Williams</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />



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



              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Submitted">Submitted</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Conditionally Approved">Conditionally Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-sidra-teal hover:bg-sidra-teal-dark text-white"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update IBC Application
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