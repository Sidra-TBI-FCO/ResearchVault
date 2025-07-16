import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertIbcApplicationSchema } from "@shared/schema";
import { Scientist, Project, ResearchActivity } from "@shared/schema";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Extend the insert schema with additional validations
const createIbcApplicationSchema = insertIbcApplicationSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  principalInvestigatorId: z.number({
    required_error: "Please select a principal investigator",
  }),

  protocolNumber: z.string().optional(),
  biosafetyLevel: z.string({
    required_error: "Please select a biosafety level",
  }),
  description: z.string().optional(),
  agents: z.string().optional(),
  // New methods fields
  materialAndMethods: z.string().optional(),
  proceduresInvolvingInfectiousAgents: z.string().optional(),
  cellCultureProcedures: z.string().optional(),
  nucleicAcidExtractionMethods: z.string().optional(),
  animalProcedures: z.string().optional(),
  laboratoryEquipment: z.string().optional(),
  disinfectionMethods: z.string().optional(),
  ppeRequirements: z.string().optional(),
  wasteSterilizationProcedures: z.string().optional(),
  riskGroupClassification: z.string().optional(),
  containmentProcedures: z.string().optional(),
  emergencyProcedures: z.string().optional(),
  location: z.string().optional(),
  buildingName: z.string().optional(),
  roomNumbers: z.string().optional(),
  researchActivityIds: z.array(z.number()).min(1, "Please select at least one research activity"),
  
  // Team members array with roles
  teamMembers: z.array(z.object({
    scientistId: z.number(),
    role: z.enum(["team_member", "team_leader", "safety_representative"]),
  })).default([]),
});

type CreateIbcApplicationFormValues = z.infer<typeof createIbcApplicationSchema>;

export default function CreateIbc() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Default form values
  const defaultValues: Partial<CreateIbcApplicationFormValues> = {
    biosafetyLevel: "BSL-2",
    researchActivityIds: [],
    teamMembers: [],
  };

  // Get all principal investigators for selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  const form = useForm<CreateIbcApplicationFormValues>({
    resolver: zodResolver(createIbcApplicationSchema),
    defaultValues,
  });

  const selectedPIId = form.watch('principalInvestigatorId');

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

  const selectedSDRIds = form.watch('researchActivityIds') || [];

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

  const createIbcApplicationMutation = useMutation({
    mutationFn: async (data: CreateIbcApplicationFormValues) => {
      console.log("Mutation starting with data:", data);
      
      // Generate IBC number if not provided
      const ibcNumber = data.protocolNumber || `IBC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      
      // Convert research activity IDs to the junction table format
      const researchActivityIds = data.researchActivityIds;
      console.log("Extracted research activity IDs:", researchActivityIds);
      
      // Prepare the main IBC application data (excluding the junction table data)
      const { researchActivityIds: _, ...ibcApplicationData } = data;
      
      const ibcData = {
        ...ibcApplicationData,
        ibcNumber,
        workflowStatus: "draft",
        riskLevel: "moderate", // Default value
        // Set submission date as null for drafts - will be set when actually submitted
        submissionDate: null,
      };

      console.log("Final IBC data to send:", ibcData);
      console.log("Final research activity IDs to send:", researchActivityIds);

      const requestBody = {
        ...ibcData,
        researchActivityIds,
      };
      
      console.log("Full request body:", requestBody);

      const response = await apiRequest("POST", "/api/ibc-applications", requestBody);
      return response.json();
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      toast({
        title: "IBC Application created",
        description: "The IBC application has been saved as draft.",
      });
      navigate("/ibc");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the IBC application.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateIbcApplicationFormValues) => {
    console.log("Form submission data:", data);
    console.log("Research Activity IDs:", data.researchActivityIds);
    console.log("Principal Investigator ID:", data.principalInvestigatorId);
    createIbcApplicationMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ibc")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">New IBC Application</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IBC Application Information</CardTitle>
          <CardDescription>Enter the details for the Institutional Biosafety Committee application</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Application Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Microbiome Sample Analysis Protocol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                        defaultValue={field.value?.toString() || undefined}
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
                                id={`activity-${activity.id}`}
                                checked={field.value?.includes(activity.id) || false}
                                onChange={(e) => {
                                  const currentValue = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValue, activity.id]);
                                  } else {
                                    field.onChange(currentValue.filter(id => id !== activity.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor={`activity-${activity.id}`} className="text-sm cursor-pointer">
                                <span className="font-medium">{activity.sdrNumber}</span> - {activity.title}
                                {activity.status && (
                                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                    activity.status === 'active' ? 'bg-green-100 text-green-800' :
                                    activity.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {activity.status}
                                  </span>
                                )}
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No research activities found for the selected Principal Investigator
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Ready for Submission">Ready for Submission</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="protocolNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IBC-2023-021" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank if not yet assigned
                      </FormDescription>
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      <FormDescription>
                        Select the highest biosafety level required for this protocol
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="agents"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Biological Agents</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Human gut bacterial isolates, recombinant DNA, viral vectors" {...field} />
                      </FormControl>
                      <FormDescription>
                        List the biological agents that will be used in this protocol
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="col-span-full">
                  <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                    <strong>Note:</strong> Submission, approval, and expiration dates will be automatically set by the system during the review process.
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the research project" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Methods and Procedures Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Methods and Procedures</CardTitle>
                  <CardDescription>
                    Detailed experimental protocols and biosafety methods
                  </CardDescription>
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
                            placeholder="Describe the detailed experimental protocols, materials, and methodologies to be used..."
                            className="resize-none"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide comprehensive details of all procedures involving biological materials
                        </FormDescription>
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
                            placeholder="Describe any procedures involving infectious agents, including containment measures..."
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
                            placeholder="Describe cell culture techniques, cell lines used, culture conditions..."
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
                            placeholder="Describe methods for DNA/RNA extraction, purification protocols..."
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
                            placeholder="Describe any animal procedures, including routes of administration, dosages..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include IACUC protocol number if animal work is involved
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="laboratoryEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Laboratory Equipment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List specialized equipment, biosafety cabinets, centrifuges, autoclaves..."
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
                    name="disinfectionMethods"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disinfection Methods</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe disinfectants used, concentrations, contact times..."
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

              {/* Risk Assessment and Classification */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Risk Assessment and Classification</CardTitle>
                  <CardDescription>
                    Biosafety level requirements and risk group classification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="riskGroupClassification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Group Classification</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                        <FormDescription>
                          Classification based on the biological agents being used
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="containmentProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Containment Procedures</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe specific containment procedures, safety protocols, and control measures..."
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
                            placeholder="Describe emergency response procedures, spill cleanup, exposure protocols..."
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
                    name="ppeRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Protective Equipment (PPE) Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Specify required PPE: gloves, lab coats, eye protection, respirators..."
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
                    name="wasteSterilizationProcedures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waste Sterilization Procedures</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe waste treatment methods, autoclaving, chemical disinfection..."
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

              {/* Team Members Section - Shows after selecting SDRs */}
              {selectedSDRIds.length === 0 ? (
                <Card className="mt-8 border-dashed border-gray-300">
                  <CardHeader>
                    <CardTitle className="text-gray-400">Team Members</CardTitle>
                    <CardDescription className="text-gray-400">
                      Select research activities above to choose team members from their staff
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Team member selection will appear here after selecting research activities
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Select team members from staff involved in the linked research activities ({selectedSDRIds.length} SDR{selectedSDRIds.length > 1 ? 's' : ''} selected)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {!availableStaff?.length ? (
                        <div className="text-sm text-muted-foreground">
                          {staffLoading ? "Loading staff..." : "No additional staff found in the selected research activities"}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground mb-4">
                            <strong>Note:</strong> The Principal Investigator is automatically included and does not need to be selected again.
                          </div>
                          
                          {availableStaff.map((staff) => {
                            const currentTeamMembers = form.watch('teamMembers') || [];
                            const isSelected = currentTeamMembers.some(member => member.scientistId === staff.id);
                            const currentMember = currentTeamMembers.find(member => member.scientistId === staff.id);
                            
                            return (
                              <div key={staff.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium">{staff.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {staff.department} • {staff.title}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`staff-${staff.id}`}
                                        className="rounded"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const currentMembers = form.getValues('teamMembers') || [];
                                          if (e.target.checked) {
                                            // Add team member
                                            form.setValue('teamMembers', [
                                              ...currentMembers,
                                              { scientistId: staff.id, role: 'team_member' as const }
                                            ]);
                                          } else {
                                            // Remove team member
                                            form.setValue('teamMembers', 
                                              currentMembers.filter(member => member.scientistId !== staff.id)
                                            );
                                          }
                                        }}
                                      />
                                      <label htmlFor={`staff-${staff.id}`} className="text-sm">Include</label>
                                    </div>
                                    <select 
                                      className="text-sm border rounded px-2 py-1" 
                                      value={currentMember?.role || ""}
                                      disabled={!isSelected}
                                      onChange={(e) => {
                                        const currentMembers = form.getValues('teamMembers') || [];
                                        const updatedMembers = currentMembers.map(member =>
                                          member.scientistId === staff.id 
                                            ? { ...member, role: e.target.value as 'team_member' | 'team_leader' | 'safety_representative' }
                                            : member
                                        );
                                        form.setValue('teamMembers', updatedMembers);
                                      }}
                                    >
                                      <option value="">Select Role</option>
                                      <option value="team_member">Team Member</option>
                                      <option value="team_leader">Team Leader</option>
                                      <option value="safety_representative">Safety Representative</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Facility and Location Information */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Facility and Location Information</CardTitle>
                  <CardDescription>
                    Specify where the research activities will be conducted
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Research Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. University Research Campus, Main Laboratory Building"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="buildingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Building Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Life Sciences Building"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roomNumbers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Numbers</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 301, 305, 307"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            List all rooms where work will be conducted
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Protocol Summary Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Protocol Summary</CardTitle>
                  <CardDescription>
                    Check all activities that apply to this research protocol
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recombinant DNA Work</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="recombinant-detection" className="rounded" />
                          <label htmlFor="recombinant-detection">Using recombinant DNA for detection/analysis</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="genomic-libraries" className="rounded" />
                          <label htmlFor="genomic-libraries">Creating genomic libraries</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="vector-construction" className="rounded" />
                          <label htmlFor="vector-construction">Cloning vector construction</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="expression-cells" className="rounded" />
                          <label htmlFor="expression-cells">Expression in cultured cells</label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Cell Lines and Materials</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="human-cell-lines" className="rounded" />
                          <label htmlFor="human-cell-lines">Use of human cell lines</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="animal-cell-lines" className="rounded" />
                          <label htmlFor="animal-cell-lines">Use of animal cell lines</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="stem-cells" className="rounded" />
                          <label htmlFor="stem-cells">Use of stem cells</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="risk-group-genes" className="rounded" />
                          <label htmlFor="risk-group-genes">Risk Group 2 or 3 genes</label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Animal and Large-Scale Work</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="animal-administration" className="rounded" />
                          <label htmlFor="animal-administration">Administering to animals</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="large-volumes" className="rounded" />
                          <label htmlFor="large-volumes">Large culture volumes (&gt;10L)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="infectious-virus" className="rounded" />
                          <label htmlFor="infectious-virus">Infectious virus work</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="toxin-genes" className="rounded" />
                          <label htmlFor="toxin-genes">Toxin genes</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <CardFooter className="flex justify-end space-x-2 px-0">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/ibc")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createIbcApplicationMutation.isPending}
                >
                  {createIbcApplicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
