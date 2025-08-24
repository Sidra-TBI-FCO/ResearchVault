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
import { ArrowLeft, Loader2, Users, X, MessageSquare, Send, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import React from "react";
import { z } from "zod";
import TimelineComments from "@/components/TimelineComments";

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
  riskGroupClassification: z.string().optional(),
  protocolSummary: z.string().optional(),
  
  // NIH Guidelines sections
  nihSectionABC: z.object({
    requiresNihDirectorApproval: z.boolean().default(false),
    drugResistanceTraits: z.boolean().default(false),
    toxinMolecules: z.boolean().default(false),
    humanGeneTransfer: z.boolean().default(false),
    approvalStatus: z.string().optional(),
    approvalDocuments: z.array(z.string()).default([]),
  }).optional(),
  
  nihSectionD: z.object({
    riskGroup2Plus: z.boolean().default(false),
    pathogenDnaRna: z.boolean().default(false),
    infectiousViral: z.boolean().default(false),
    wholeAnimalExperiments: z.boolean().default(false),
    largeScaleExperiments: z.boolean().default(false),
    geneDriveOrganisms: z.boolean().default(false),
    containmentLevel: z.string().optional(),
    ibcApprovalDate: z.string().optional(),
  }).optional(),
  
  nihSectionE: z.object({
    limitedViralGenome: z.boolean().default(false),
    plantExperiments: z.boolean().default(false),
    transgenicRodents: z.boolean().default(false),
    registrationDate: z.string().optional(),
  }).optional(),
  
  nihSectionF: z.object({
    exemptExperiments: z.boolean().default(false),
    exemptionCategories: z.array(z.string()).default([]),
    exemptionJustification: z.string().optional(),
  }).optional(),
  
  nihAppendixC: z.object({
    biologicalAgents: z.array(z.object({
      agentName: z.string(),
      riskGroup: z.enum(["1", "2", "3", "4"]),
      containmentRequired: z.string(),
    })).default([]),
    additionalAgents: z.string().optional(),
  }).optional(),
  
  // Methods and Procedures
  materialAndMethods: z.string().optional(),
  proceduresInvolvingInfectiousAgents: z.string().optional(),
  cellCultureProcedures: z.string().optional(),
  nucleicAcidExtractionMethods: z.string().optional(),
  animalProcedures: z.string().optional(),
  
  // Safety and Containment
  containmentProcedures: z.string().optional(),
  emergencyProcedures: z.string().optional(),
  wasteDisposalPlan: z.string().optional(),
  
  // Legacy biosafety checkboxes (for compatibility)
  recombinantDNA: z.boolean().optional(),
  humanMaterials: z.boolean().optional(),
  animalWork: z.boolean().optional(),
  fieldWork: z.boolean().optional(),
  
  // Team members and comments
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
  submissionComment: z.string().optional(),
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
  const [submissionComment, setSubmissionComment] = useState("");

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

  // Fetch comments for this application
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/ibc-applications/${id}/comments`],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Determine if this is read-only mode (non-draft applications)
  const isReadOnly = ibcApplication?.status?.toLowerCase() !== 'draft';

  const form = useForm<EditIbcApplicationFormValues>({
    resolver: zodResolver(editIbcApplicationSchema),
    defaultValues: {
      cayuseProtocolNumber: "",
      title: "",
      shortTitle: "",
      principalInvestigatorId: 0,
      biosafetyLevel: "BSL-2",
      description: "",
      
      // Biosafety options with default values
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
      riskGroupClassification: "",
      protocolSummary: "",
      
      // NIH Guidelines sections defaults
      nihSectionABC: {
        requiresNihDirectorApproval: false,
        drugResistanceTraits: false,
        toxinMolecules: false,
        humanGeneTransfer: false,
        approvalDocuments: [],
      },
      nihSectionD: {
        riskGroup2Plus: false,
        pathogenDnaRna: false,
        infectiousViral: false,
        wholeAnimalExperiments: false,
        largeScaleExperiments: false,
        geneDriveOrganisms: false,
      },
      nihSectionE: {
        limitedViralGenome: false,
        plantExperiments: false,
        transgenicRodents: false,
      },
      nihSectionF: {
        exemptExperiments: false,
        exemptionCategories: [],
      },
      nihAppendixC: {
        biologicalAgents: [],
      },
      
      // Methods and Procedures defaults
      materialAndMethods: "",
      proceduresInvolvingInfectiousAgents: "",
      cellCultureProcedures: "",
      nucleicAcidExtractionMethods: "",
      animalProcedures: "",
      
      // Safety and Containment defaults
      containmentProcedures: "",
      emergencyProcedures: "",
      wasteDisposalPlan: "",
      
      // Legacy biosafety checkboxes defaults
      recombinantDNA: false,
      humanMaterials: false,
      animalWork: false,
      fieldWork: false,
      
      researchActivityIds: [],
      teamMembers: [],
    },
  });

  // Update form when data loads
  React.useEffect(() => {
    if (ibcApplication && associatedActivities) {
      const formData = {
        cayuseProtocolNumber: ibcApplication.cayuseProtocolNumber || "",
        title: ibcApplication.title || "",
        shortTitle: ibcApplication.shortTitle || "",
        principalInvestigatorId: ibcApplication.principalInvestigatorId ?? 0,
        biosafetyLevel: ibcApplication.biosafetyLevel || "BSL-2",
        description: ibcApplication.description || "",
        
        // Biosafety options with actual values
        recombinantSyntheticNucleicAcid: ibcApplication.recombinantSyntheticNucleicAcid || false,
        wholeAnimalsAnimalMaterial: ibcApplication.wholeAnimalsAnimalMaterial || false,
        animalMaterialSubOptions: ibcApplication.animalMaterialSubOptions || [],
        humanNonHumanPrimateMaterial: ibcApplication.humanNonHumanPrimateMaterial || false,
        introducingPrimateMaterialIntoAnimals: ibcApplication.introducingPrimateMaterialIntoAnimals || false,
        microorganismsInfectiousMaterial: ibcApplication.microorganismsInfectiousMaterial || false,
        biologicalToxins: ibcApplication.biologicalToxins || false,
        nanoparticles: ibcApplication.nanoparticles || false,
        arthropods: ibcApplication.arthropods || false,
        plants: ibcApplication.plants || false,
        riskGroupClassification: ibcApplication.riskGroupClassification || "",
        protocolSummary: ibcApplication.protocolSummary || "",
        
        // NIH Guidelines sections actual values
        nihSectionABC: ibcApplication.nihSectionABC || {
          requiresNihDirectorApproval: false,
          drugResistanceTraits: false,
          toxinMolecules: false,
          humanGeneTransfer: false,
          approvalDocuments: [],
        },
        nihSectionD: ibcApplication.nihSectionD || {
          riskGroup2Plus: false,
          pathogenDnaRna: false,
          infectiousViral: false,
          wholeAnimalExperiments: false,
          largeScaleExperiments: false,
          geneDriveOrganisms: false,
        },
        nihSectionE: ibcApplication.nihSectionE || {
          limitedViralGenome: false,
          plantExperiments: false,
          transgenicRodents: false,
        },
        nihSectionF: ibcApplication.nihSectionF || {
          exemptExperiments: false,
          exemptionCategories: [],
        },
        nihAppendixC: ibcApplication.nihAppendixC || {
          biologicalAgents: [],
        },
        
        // Methods and Procedures actual values
        materialAndMethods: ibcApplication.materialAndMethods || "",
        proceduresInvolvingInfectiousAgents: ibcApplication.proceduresInvolvingInfectiousAgents || "",
        cellCultureProcedures: ibcApplication.cellCultureProcedures || "",
        nucleicAcidExtractionMethods: ibcApplication.nucleicAcidExtractionMethods || "",
        animalProcedures: ibcApplication.animalProcedures || "",
        
        // Safety and Containment actual values
        containmentProcedures: ibcApplication.containmentProcedures || "",
        emergencyProcedures: ibcApplication.emergencyProcedures || "",
        wasteDisposalPlan: ibcApplication.wasteDisposalPlan || "",
        
        // Legacy biosafety checkboxes actual values
        recombinantDNA: ibcApplication.recombinantDNA || false,
        humanMaterials: ibcApplication.humanMaterials || false,
        animalWork: ibcApplication.animalWork || false,
        fieldWork: ibcApplication.fieldWork || false,
        
        researchActivityIds: associatedActivities.map(ra => ra.id) || [],
        teamMembers: [],
      };
      
      form.reset(formData);
    }
  }, [ibcApplication, associatedActivities, form]);

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
    mutationFn: async (data: any) => {
      // First update the application
      const response = await apiRequest("PATCH", `/api/ibc-applications/${id}`, { ...data, isDraft: false });
      
      // Then create the submission comment if provided
      if (submissionComment.trim()) {
        await apiRequest("POST", `/api/ibc-applications/${id}/pi-comment`, {
          comment: submissionComment.trim()
        });
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IBC application submitted successfully",
      });
      setSubmissionComment(""); // Clear the comment
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications', id] });
      queryClient.invalidateQueries({ queryKey: [`/api/ibc-applications/${id}/comments`] });
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
    // Require submission comment when submitting application
    if (!submissionComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment explaining your submission before proceeding.",
        variant: "destructive",
      });
      return;
    }

    const { teamMembers, researchActivityIds, submissionComment: formComment, ...ibcData } = data;
    const protocolTeamMembers = JSON.stringify(teamMembers);
    
    // Keep existing piResponses for backward compatibility
    let piResponses = ibcApplication?.piResponses || [];
    
    return await submitMutation.mutateAsync({ 
      ...ibcData, 
      protocolTeamMembers, 
      piResponses
    });
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
        <h1 className="text-2xl font-semibold text-neutral-400">
          {isReadOnly ? 'View IBC Application' : 'Edit IBC Application'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nih-guidelines">NIH Guidelines</TabsTrigger>
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
                            disabled={isReadOnly}
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
                                    disabled={isReadOnly}
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
                            <Input placeholder="Cayuse protocol number" {...field} disabled={isReadOnly} />
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
                            <Input placeholder="IBC application title" {...field} disabled={isReadOnly} />
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
                            <Input placeholder="Short recognition title" {...field} disabled={isReadOnly} />
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
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

                  <FormField
                    control={form.control}
                    name="riskGroupClassification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Group Classification</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
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

                  {/* Legacy Biosafety Checkboxes for compatibility */}
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
                              disabled={isReadOnly}
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


            </TabsContent>

            <TabsContent value="staff" className="space-y-6 mt-6">
              <Card>
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
                  {form.watch('researchActivityIds')?.length > 0 && availableStaff?.length ? (
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
                                  const isAlreadySelected = currentTeamMembers.some(member => 
                                    member.scientistId === staff.id || member.name === staff.name
                                  );
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
                      {!form.watch('researchActivityIds')?.length 
                        ? "Select research activities in the Basics tab to add team members from their staff"
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
                          placeholder="Provide a general overview of your research - describe what your research will be about, the scientific objectives, and the broader goals of the study" 
                          className="resize-none" 
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        Describe the general overview of what your research will be about
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="protocolSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol Summary</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the key protocols or methods being used in this research - include specific experimental procedures, techniques, equipment, and methodological approaches that will be employed" 
                          className="resize-none" 
                          rows={6}
                          {...field}
                          value={field.value || ""}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide details about the key protocols or methods being used in your research
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />


              </div>
            </TabsContent>

            <TabsContent value="nih-guidelines" className="space-y-6 mt-6">
              {/* NIH Section III-A/B/C - High Risk Experiments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-red-800">NIH Section III-A/B/C</CardTitle>
                  <CardDescription className="text-red-600">
                    Experiments requiring NIH Director approval and/or IBC approval before initiation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihSectionABC.drugResistanceTraits"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              III-A: Deliberate transfer of drug resistance traits to microorganisms
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Requires NIH Director approval + IBC approval
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionABC.toxinMolecules"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              III-B: Cloning toxin molecules with LD50 &lt; 100 ng/kg
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Requires NIH OSP + IBC approval
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionABC.humanGeneTransfer"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              III-C: Human gene transfer experiments
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Requires IBC + IRB + RAC approval
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* NIH Section III-D - IBC Approval Required */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-orange-800">NIH Section III-D</CardTitle>
                  <CardDescription className="text-orange-600">
                    Experiments requiring IBC approval before initiation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihSectionD.riskGroup2Plus"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Risk Group 2+ pathogen host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Using Risk Group 2, 3, 4, or restricted agents as hosts
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.pathogenDnaRna"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Pathogen DNA/RNA in non-pathogenic hosts
                            </FormLabel>
                            <FormDescription className="text-xs">
                              DNA/RNA from Risk Group 2+ pathogens in non-pathogenic systems
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.infectiousViral"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Infectious viral vectors in tissue culture
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Infectious DNA/RNA viruses or defective viruses with helper
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.wholeAnimalExperiments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Whole animal experiments
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Recombinant/synthetic nucleic acids in whole animals (including transgenic)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.largeScaleExperiments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Large-scale experiments (&gt;10 liters)
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Culture volumes exceeding 10 liters
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.geneDriveOrganisms"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Gene drive modified organisms
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Minimum BL2, BL2-N, or BL2-P containment required
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* NIH Section III-E - Registration Required */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-yellow-800">NIH Section III-E</CardTitle>
                  <CardDescription className="text-yellow-600">
                    Experiments requiring registration simultaneous with initiation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihSectionE.limitedViralGenome"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Limited viral genome experiments
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Recombinant nucleic acids containing ≤2/3 of eukaryotic virus genome
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionE.plantExperiments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Plant experiments
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Experiments involving whole plants with specific conditions
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionE.transgenicRodents"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Transgenic rodents (BL1 containment)
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Generation/use of transgenic rodents requiring only BL1 containment
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* NIH Section III-F - Exempt Experiments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-green-800">NIH Section III-F</CardTitle>
                  <CardDescription className="text-green-600">
                    Exempt experiments (may still require institutional oversight)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihSectionF.exemptExperiments"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              disabled={isReadOnly}
                              className="rounded border-gray-300"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium">
                              Research qualifies for NIH exemption
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Experiments exempt from NIH Guidelines requirements
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('nihSectionF.exemptExperiments') && (
                      <FormField
                        control={form.control}
                        name="nihSectionF.exemptionJustification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exemption Justification</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Explain why this research qualifies for exemption under Section III-F..."
                                className="resize-none"
                                rows={3}
                                {...field}
                                value={field.value || ""}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* NIH Appendix C - Biological Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-800">Appendix C - Biological Agent Classification</CardTitle>
                  <CardDescription className="text-blue-600">
                    Classification of biological agents based on risk groups
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="nihAppendixC.additionalAgents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Biological Agents</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="List any biological agents not covered above, including their risk group classifications..."
                            className="resize-none"
                            rows={4}
                            {...field}
                            value={field.value || ""}
                            disabled={isReadOnly}
                          />
                        </FormControl>
                        <FormDescription>
                          Include agent names, risk group classifications (1-4), and required containment levels
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="construction" className="space-y-6 mt-6">
              {/* Methods and Procedures Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Methods and Procedures</CardTitle>
                  <CardDescription>Detailed experimental protocols and methodologies</CardDescription>
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
                            value={field.value || ""}
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
                            value={field.value || ""}
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
                            value={field.value || ""}
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
                            value={field.value || ""}
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
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Safety and Containment Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Safety and Containment</CardTitle>
                  <CardDescription>Safety protocols and containment procedures</CardDescription>
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
                            value={field.value || ""}
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
                            value={field.value || ""}
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
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Communication History */}
          {comments.length > 0 && (
            <div className="mt-6">
              <TimelineComments 
                application={ibcApplication} 
                comments={comments} 
                title="Communication History"
              />
            </div>
          )}

          {/* Submission Comment - Required when submitting */}
          {!isReadOnly && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Submission Comment
                </CardTitle>
                <CardDescription>
                  Provide a comment explaining your submission (required when submitting application)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Explain the purpose of this submission, any changes made, or additional information for the IBC office..."
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This comment will be recorded with your submission and visible to the IBC office and reviewers
                </p>
              </CardContent>
            </Card>
          )}

          {!isReadOnly && (
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
                disabled={saveMutation.isPending || submitMutation.isPending || !submissionComment.trim()}
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
          )}
          
          {isReadOnly && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                This application has been submitted and cannot be edited. Contact the IBC office if changes are needed.
              </p>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}