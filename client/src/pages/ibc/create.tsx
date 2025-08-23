import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertIbcApplicationSchema } from "@shared/schema";
import { Scientist, Project, ResearchActivity } from "@shared/schema";
import { CalendarIcon, ArrowLeft, Users, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// Create form schema excluding auto-generated fields and adding custom validations
const createIbcApplicationSchema = insertIbcApplicationSchema.omit({
  ibcNumber: true, // Auto-generated
  status: true, // Auto-generated
  workflowStatus: true, // Auto-generated
  riskLevel: true, // Auto-generated based on biosafetyLevel
}).extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  principalInvestigatorId: z.number({
    required_error: "Please select a principal investigator",
  }),
  biosafetyLevel: z.string({
    required_error: "Please select a biosafety level",
  }),
  researchActivityIds: z.array(z.number()).min(1, "Please select at least one research activity"),
  
  // Biosafety Options (all required)
  recombinantSyntheticNucleicAcid: z.boolean(),
  wholeAnimalsAnimalMaterial: z.boolean(),
  animalMaterialSubOptions: z.array(z.string()).optional(),
  humanNonHumanPrimateMaterial: z.boolean(),
  introducingPrimateMaterialIntoAnimals: z.boolean().optional(),
  microorganismsInfectiousMaterial: z.boolean(),
  biologicalToxins: z.boolean(),
  nanoparticles: z.boolean(),
  arthropods: z.boolean(),
  plants: z.boolean(),
  
  // Additional fields
  biologicalAgents: z.string().optional(),
  
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
    // Default biosafety options to false
    recombinantSyntheticNucleicAcid: false,
    wholeAnimalsAnimalMaterial: false,
    animalMaterialSubOptions: [],
    humanNonHumanPrimateMaterial: false,
    introducingPrimateMaterialIntoAnimals: false,
    microorganismsInfectiousMaterial: false,
    biologicalToxins: false,
    nanoparticles: false,
    arthropods: false,
    plants: false,
    biologicalAgents: "",
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
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

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

  // Save as Draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: CreateIbcApplicationFormValues) => {
      console.log("Saving as draft with data:", data);
      
      // Extract research activity IDs for the junction table
      const researchActivityIds = data.researchActivityIds;
      console.log("Extracted research activity IDs:", researchActivityIds);
      
      // Prepare the main IBC application data (excluding the junction table data)
      const { researchActivityIds: _, ...ibcApplicationData } = data;
      
      // Send the complete request with isDraft flag
      const requestBody = {
        ...ibcApplicationData,
        researchActivityIds,
        isDraft: true,
      };
      
      console.log("Full draft request body:", requestBody);

      const response = await apiRequest("POST", "/api/ibc-applications", requestBody);
      return response.json();
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      toast({
        title: "Draft Saved",
        description: "The IBC application has been saved as a draft.",
      });
      navigate("/ibc");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error saving the draft.",
        variant: "destructive",
      });
    },
  });

  // Submit Application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (data: CreateIbcApplicationFormValues) => {
      console.log("Submitting application with data:", data);
      
      // Extract research activity IDs for the junction table
      const researchActivityIds = data.researchActivityIds;
      console.log("Extracted research activity IDs:", researchActivityIds);
      
      // Prepare the main IBC application data (excluding the junction table data)
      const { researchActivityIds: _, ...ibcApplicationData } = data;
      
      // Send the complete request (backend handles auto-generation)
      const requestBody = {
        ...ibcApplicationData,
        researchActivityIds,
        isDraft: false,
      };
      
      console.log("Full submission request body:", requestBody);

      const response = await apiRequest("POST", "/api/ibc-applications", requestBody);
      return response.json();
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      toast({
        title: "Application Submitted",
        description: "The IBC application has been successfully submitted for review.",
      });
      navigate("/ibc");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error submitting the application.",
        variant: "destructive",
      });
    },
  });

  // Handler for saving as draft
  const onSaveAsDraft = (data: CreateIbcApplicationFormValues) => {
    console.log("Saving as draft:", data);
    saveDraftMutation.mutate(data);
  };

  // Handler for submitting application
  const onSubmitApplication = (data: CreateIbcApplicationFormValues) => {
    console.log("Submitting application:", data);
    submitApplicationMutation.mutate(data);
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
            <form className="space-y-6">
              <Tabs defaultValue="basics" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basics">Basics</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="under-construction">Under Construction</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basics" className="space-y-6 mt-6">
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
                  name="cayuseProtocolNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cayuse Protocol Number</FormLabel>
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
                
                {/* Biosafety Options Section */}
                <div className="col-span-full">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-900">Choose Biosafety Options</CardTitle>
                      <CardDescription className="text-blue-700">
                        Please indicate if your research involves any of the following materials or organisms (all questions are mandatory)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 gap-6">
                        
                        <FormField
                          control={form.control}
                          name="recombinantSyntheticNucleicAcid"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Recombinant and Synthetic Nucleic Acid Molecules (e.g., bacterial/mammalian expression plasmids, replication incompetent viral vectors, chemically synthesized nucleic acid molecules)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="wholeAnimalsAnimalMaterial"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Whole Animals/Animal Material (e.g., introduction of biologicals/chemicals into animals, use of animal cell lines and/or tissues)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Conditional sub-options for Animal Material */}
                        {form.watch('wholeAnimalsAnimalMaterial') && (
                          <FormField
                            control={form.control}
                            name="animalMaterialSubOptions"
                            render={({ field }) => (
                              <FormItem className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 ml-8">
                                <div className="space-y-4">
                                  <FormLabel className="text-base font-medium text-yellow-800">
                                    Please select all that apply to your research:
                                  </FormLabel>
                                  <FormControl>
                                    <div className="space-y-3">
                                      {[
                                        { id: "live_animals", label: "Live Animals" },
                                        { id: "animal_tissues", label: "Animal Tissues" },
                                        { id: "animal_cell_lines", label: "Animal Cell Lines" },
                                        { id: "animal_blood_serum", label: "Animal Blood/Serum" },
                                        { id: "animal_derived_products", label: "Animal-derived Products" },
                                        { id: "transgenic_animals", label: "Transgenic Animals" },
                                        { id: "animal_waste", label: "Animal Waste/Excretions" },
                                        { id: "other_animal_materials", label: "Other Animal Materials" }
                                      ].map((option) => (
                                        <div key={option.id} className="flex items-center space-x-3">
                                          <Checkbox
                                            id={option.id}
                                            checked={(field.value || []).includes(option.id)}
                                            onCheckedChange={(checked) => {
                                              const currentValues = field.value || [];
                                              if (checked) {
                                                field.onChange([...currentValues, option.id]);
                                              } else {
                                                field.onChange(currentValues.filter((value) => value !== option.id));
                                              }
                                            }}
                                          />
                                          <label
                                            htmlFor={option.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            {option.label}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="humanNonHumanPrimateMaterial"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Human & Non-Human Primate Material (e.g., blood, fluids, tissues, primary/established cell lines)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Conditional sub-question for Human/Non-Human Primate Material */}
                        {form.watch('humanNonHumanPrimateMaterial') && (
                          <FormField
                            control={form.control}
                            name="introducingPrimateMaterialIntoAnimals"
                            render={({ field }) => (
                              <FormItem className="bg-orange-50 p-4 rounded-lg border border-orange-200 ml-8">
                                <div className="space-y-3">
                                  <FormLabel className="text-base font-medium text-orange-800">
                                    Will you be introducing these materials into animals?
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex items-center space-x-6">
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          checked={field.value === true}
                                          onChange={() => field.onChange(true)}
                                          className="w-4 h-4 text-orange-600"
                                        />
                                        <span>Yes</span>
                                      </label>
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          checked={field.value === false}
                                          onChange={() => field.onChange(false)}
                                          className="w-4 h-4 text-orange-600"
                                        />
                                        <span>No</span>
                                      </label>
                                    </div>
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="microorganismsInfectiousMaterial"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Microorganisms/Potentially Infectious Material (e.g., viruses, bacteria, yeast, fungi, parasites, prions)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="biologicalToxins"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Biological Toxins (e.g., cholera toxin, pertussis toxin, diphtheria toxin, tetrodotoxin)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="nanoparticles"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Nanoparticles (e.g., use of Jet-Pei or Poly-L-Lysine to form nano-sized particles)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="arthropods"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Arthropods (e.g., insects, spiders, crabs, lobsters, shrimp)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="plants"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Plants (e.g., toxic/transgenic plants)
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        className="w-4 h-4 text-blue-600"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>
                    </CardContent>
                  </Card>
                </div>

                    <FormField
                      control={form.control}
                      name="biologicalAgents"
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
                  </div>
                </TabsContent>

                <TabsContent value="staff" className="space-y-6 mt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Staff management section coming soon...
                  </div>
                </TabsContent>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of the research project" 
                              className="resize-none" 
                              rows={4}
                              {...field}
                              value={field.value || ""} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                      <strong>Note:</strong> Submission, approval, and expiration dates will be automatically set by the system during the review process.
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="under-construction" className="space-y-6 mt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    Additional sections under construction...
                  </div>
                </TabsContent>
              </Tabs>

              <CardFooter className="flex justify-end space-x-2 px-0 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/ibc")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  variant="secondary"
                  type="button"
                  disabled={saveDraftMutation.isPending || submitApplicationMutation.isPending}
                  onClick={form.handleSubmit(onSaveAsDraft)}
                >
                  {saveDraftMutation.isPending ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button 
                  type="button"
                  disabled={saveDraftMutation.isPending || submitApplicationMutation.isPending}
                  onClick={form.handleSubmit(onSubmitApplication)}
                >
                  {submitApplicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
                  <CardDescription>
                    Detailed experimental protocols and biosafety methods
                  </CardDescription>
