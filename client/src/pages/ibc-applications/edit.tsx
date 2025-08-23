import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIbcApplicationSchema, type InsertIbcApplication, type IbcApplication, type ResearchActivity, type Scientist } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React from "react";
import { z } from "zod";

// Extended schema for edit form with biosafety options
const editIbcApplicationSchema = insertIbcApplicationSchema.omit({
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
  
  // Team members and comments
  teamMembers: z.array(z.object({
    scientistId: z.number(),
    role: z.enum(["team_member", "team_leader", "safety_representative"]),
  })).default([]),
  submissionComment: z.string().optional(),
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
    queryFn: () => fetch(`/api/ibc-applications/${id}/research-activities`).then(res => res.json()),
    enabled: !!id,
  });

  const form = useForm<EditIbcApplicationFormValues>({
    resolver: zodResolver(editIbcApplicationSchema),
    defaultValues: {
      cayuseProtocolNumber: ibcApplication?.cayuseProtocolNumber || "",
      title: ibcApplication?.title || "",
      shortTitle: ibcApplication?.shortTitle || "",
      principalInvestigatorId: ibcApplication?.principalInvestigatorId || 0,
      biosafetyLevel: ibcApplication?.biosafetyLevel || "BSL-2",
      description: ibcApplication?.description || "",
      
      // Biosafety options with default values
      recombinantSyntheticNucleicAcid: ibcApplication?.recombinantSyntheticNucleicAcid || false,
      wholeAnimalsAnimalMaterial: ibcApplication?.wholeAnimalsAnimalMaterial || false,
      animalMaterialSubOptions: ibcApplication?.animalMaterialSubOptions || [],
      humanNonHumanPrimateMaterial: ibcApplication?.humanNonHumanPrimateMaterial || false,
      introducingPrimateMaterialIntoAnimals: ibcApplication?.introducingPrimateMaterialIntoAnimals || false,
      microorganismsInfectiousMaterial: ibcApplication?.microorganismsInfectiousMaterial || false,
      biologicalToxins: ibcApplication?.biologicalToxins || false,
      nanoparticles: ibcApplication?.nanoparticles || false,
      arthropods: ibcApplication?.arthropods || false,
      plants: ibcApplication?.plants || false,
      biologicalAgents: ibcApplication?.biologicalAgents || "",
      
      researchActivityIds: associatedActivities?.map(ra => ra.id) || [],
      teamMembers: [],
    },
  });

  const selectedPIId = form.watch('principalInvestigatorId');

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

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/ibc-applications/${id}`, { ...data, isDraft: true });
    },
    onSuccess: () => {
      toast({
        title: "Saved",
        description: "IBC application saved as draft successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save IBC application",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => {
      return apiRequest("PATCH", `/api/ibc-applications/${id}`, { ...data, isDraft: false });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IBC application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
      navigate(`/ibc-applications/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit IBC application",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (data: EditIbcApplicationFormValues) => {
    const { teamMembers, researchActivityIds, submissionComment, ...ibcData } = data;
    const protocolTeamMembers = JSON.stringify(teamMembers);
    
    let piResponses = ibcApplication?.piResponses || [];
    if (submissionComment && submissionComment.trim()) {
      const newComment = {
        comment: submissionComment.trim(),
        timestamp: new Date().toISOString(),
        type: 'submission_comment'
      };
      if (Array.isArray(piResponses)) {
        piResponses = [...piResponses, newComment];
      } else {
        piResponses = [newComment];
      }
    }
    
    return await saveMutation.mutateAsync({ ...ibcData, protocolTeamMembers, piResponses });
  };

  const handleSubmit = async (data: EditIbcApplicationFormValues) => {
    const { teamMembers, researchActivityIds, submissionComment, ...ibcData } = data;
    const protocolTeamMembers = JSON.stringify(teamMembers);
    
    let piResponses = ibcApplication?.piResponses || [];
    if (submissionComment && submissionComment.trim()) {
      const newComment = {
        comment: submissionComment.trim(),
        timestamp: new Date().toISOString(),
        type: 'submission_comment'
      };
      if (Array.isArray(piResponses)) {
        piResponses = [...piResponses, newComment];
      } else {
        piResponses = [newComment];
      }
    }
    
    return await submitMutation.mutateAsync({ ...ibcData, protocolTeamMembers, piResponses });
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

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="construction">Under Construction</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Core IBC application details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="principalInvestigatorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Principal Investigator</FormLabel>
                          <FormDescription>
                            Select the PI first to filter related research activities
                          </FormDescription>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
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
                        <FormItem>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="IBC application title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </CardContent>
              </Card>

              {/* Biosafety Options Section - copied from create form */}
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

                      {/* Continue with remaining biosafety options */}
                      <FormField
                        control={form.control}
                        name="microorganismsInfectiousMaterial"
                        render={({ field }) => (
                          <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="space-y-3">
                              <FormLabel className="text-base font-medium">
                                Microorganisms/Infectious Material (e.g., bacteria, fungi, parasites, viruses, or other microorganisms)
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
                                Biological Toxins (e.g., toxins of biological origin, including recombinant forms)
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
                                Nanoparticles (e.g., engineered nanoparticles for drug delivery or research applications)
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
                                Arthropods (e.g., insects, spiders, or other arthropods that may serve as disease vectors)
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
                                Plants (e.g., genetically modified plants or plant pathogens)
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

                <FormField
                  control={form.control}
                  name="submissionComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any comments or responses to office feedback that you'd like to include with your submission..." 
                          className="resize-none" 
                          rows={4}
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormDescription>
                        This comment will be visible to the IBC office and will appear in the application timeline.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="construction" className="space-y-6 mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Additional sections under construction...
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 pt-6">
            <Button 
              type="button" 
              disabled={saveMutation.isPending || submitMutation.isPending}
              variant="outline"
              onClick={async () => {
                const formData = form.getValues();
                try {
                  await handleSave(formData);
                } catch (error) {
                  console.error('Error in handleSave:', error);
                }
              }}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button 
              type="button" 
              disabled={saveMutation.isPending || submitMutation.isPending}
              className="bg-sidra-teal hover:bg-sidra-teal-dark text-white"
              onClick={async () => {
                const formData = form.getValues();
                try {
                  await handleSubmit(formData);
                } catch (error) {
                  console.error('Error in handleSubmit:', error);
                }
              }}
            >
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}