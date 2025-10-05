import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Loader2, Users, X, MessageSquare, Send, Eye, Plus, Trash2, ChevronDown, ChevronUp, Building2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import IbcFacilitiesTab from "@/components/IbcFacilitiesTab";
import { IbcInactivationDecontaminationTab } from "@/components/IbcInactivationDecontaminationTab";
import { IbcDisposalTab } from "@/components/IbcDisposalTab";
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
  
  // Transport/Shipping fields
  deviatingFromLocalTransport: z.boolean().optional(),
  deviatingFromLocalTransportDetails: z.string().optional(),
  transportingBioHazardousToOffCampus: z.boolean().optional(),
  transportingBioHazardousToOffCampusDetails: z.string().optional(),
  receivingBiologicalFromOffCampus: z.boolean().optional(),
  
  // Dual Use fields
  dualUseAgentsAndToxins: z.array(z.string()).optional(),
  dualUseCategoriesApply: z.boolean().optional(),
  dualUseCategoriesExplanation: z.string().optional(),
  dualUseExperimentCategories: z.array(z.string()).optional(),
  
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
    wholePlants: z.boolean().default(false),
    largeScaleExperiments: z.boolean().default(false),
    influenzaViruses: z.boolean().default(false),
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
    f1TissueCulture: z.boolean().default(false),
    f2EcoliK12: z.boolean().default(false),
    f3Saccharomyces: z.boolean().default(false),
    f4Kluyveromyces: z.boolean().default(false),
    f5Bacillus: z.boolean().default(false),
    f6GramPositive: z.boolean().default(false),
    f7TransgenicRodents: z.boolean().default(false),
    f8TransgenicBreeding: z.boolean().default(false),
    exemptionJustification: z.string().optional(),
  }).optional(),
  
  nihAppendixC: z.object({
    cI: z.boolean().default(false),
    cII: z.boolean().default(false),
    cIII: z.boolean().default(false),
    cIV: z.boolean().default(false),
    cV: z.boolean().default(false),
    cVI: z.boolean().default(false),
    cVII: z.boolean().default(false),
    cVIII: z.boolean().default(false),
    cIX: z.boolean().default(false),
    additionalConsiderations: z.string().optional(),
  }).optional(),
  
  syntheticExperiments: z.array(z.object({
    backboneSource: z.string().optional(),
    vectorInsertName: z.string().optional(),
    vectorInsert: z.string().optional(),
    insertedDnaSource: z.string().optional(),
    dnaSequenceNature: z.object({
      anonymousMarker: z.boolean().default(false),
      genomicDNA: z.boolean().default(false),
      toxinGene: z.boolean().default(false),
      cDNA: z.boolean().default(false),
      snRNAsiRNA: z.boolean().default(false),
      other: z.boolean().default(false),
    }).optional(),
    anticipatedEffect: z.object({
      antiApoptotic: z.boolean().default(false),
      cytokineInducer: z.boolean().default(false),
      cytokineInhibitor: z.boolean().default(false),
      growthFactor: z.boolean().default(false),
      oncogene: z.boolean().default(false),
      toxic: z.boolean().default(false),
      tumorInducer: z.boolean().default(false),
      tumorInhibitor: z.boolean().default(false),
      otherSpecify: z.string().optional(),
    }).optional(),
    viralGenomeFraction: z.string().optional(),
    replicationCompetent: z.string().optional(),
    packagingCellLines: z.string().optional(),
    tropism: z.string().optional(),
    exposedTo: z.object({
      arthropods: z.boolean().default(false),
      cellCulture: z.boolean().default(false),
      humans: z.boolean().default(false),
      invertebrateAnimals: z.boolean().default(false),
      microOrganism: z.boolean().default(false),
      none: z.boolean().default(false),
      plantsTransgenicPlants: z.boolean().default(false),
      vertebrateAnimals: z.boolean().default(false),
    }).optional(),
    vectorSource: z.object({
      researchCollaborator: z.boolean().default(false),
      commercialVendor: z.boolean().default(false),
      institutionLab: z.boolean().default(false),
      otherSource: z.boolean().default(false),
    }).optional(),
    organismName: z.string().optional(),
    organismSource: z.object({
      library: z.boolean().default(false),
      pcr: z.boolean().default(false),
      syntheticOligo: z.boolean().default(false),
      other: z.boolean().default(false),
    }).optional(),
  })).default([]),
  
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
  animalWork: z.boolean().optional(),
  fieldWork: z.boolean().optional(),
  
  // Human/NHP Section
  humanOrigin: z.boolean().optional(),
  humanMaterials: z.array(z.string()).optional(),
  humanMaterialsTissuesOther: z.string().optional(),
  humanMaterialsOtherMaterial: z.string().optional(),
  nonHumanPrimateOrigin: z.boolean().optional(),
  stemCells: z.array(z.string()).optional(),
  cellLines: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    species: z.string().optional(),
    descriptor: z.string().optional(),
    biosafetyLevel: z.string(),
    acquisitionSource: z.array(z.string()),
    passage: z.string(),
    exposedTo: z.array(z.string()),
    willBeCultured: z.boolean(),
  })).optional(),
  hazardousProcedures: z.array(z.object({
    id: z.string().optional(),
    cellLineId: z.string(),
    cellLineName: z.string(),
    procedure: z.string(),
    otherCellsDescription: z.string().optional(),
    engineeringControls: z.array(z.string()),
    ppe: z.array(z.string()),
    procedureDetails: z.string(),
  })).optional(),
  exposureControlPlanCompliance: z.boolean().optional(),
  handWashingDevice: z.boolean().optional(),
  laundryMethod: z.array(z.string()).optional(),
  laundryMethodOther: z.string().optional(),
  materialsContainKnownPathogens: z.boolean().optional(),
  materialPathogenDetails: z.string().optional(),
  materialTreatmentDetails: z.string().optional(),
  infectionSymptoms: z.string().optional(),
  
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
  const [collapsedProcedures, setCollapsedProcedures] = useState<Set<number>>(new Set());
  const [collapsedSyntheticExperiments, setCollapsedSyntheticExperiments] = useState<Set<number>>(new Set());
  
  // State for cell line dialog
  const [cellLineDialogOpen, setCellLineDialogOpen] = useState(false);
  const [editingCellLineIndex, setEditingCellLineIndex] = useState<number | null>(null);
  const [cellLineFormData, setCellLineFormData] = useState({
    name: "",
    species: "",
    descriptor: "",
    biosafetyLevel: "",
    acquisitionSource: [] as string[],
    passage: "",
    exposedTo: [] as string[],
    willBeCultured: false,
  });

  // State for hazardous procedures dialog
  const [hazardousProcedureDialogOpen, setHazardousProcedureDialogOpen] = useState(false);
  const [editingHazardousProcedureIndex, setEditingHazardousProcedureIndex] = useState<number | null>(null);
  const [hazardousProcedureFormData, setHazardousProcedureFormData] = useState({
    cellLineId: "",
    cellLineName: "",
    procedure: "",
    otherCellsDescription: "",
    engineeringControls: [] as string[],
    ppe: [] as string[],
    procedureDetails: "",
  });

  // State for conditional tab visibility with data protection
  const [nucleicAcidsConfirmDialog, setNucleicAcidsConfirmDialog] = useState(false);
  const [humanNhpConfirmDialog, setHumanNhpConfirmDialog] = useState(false);
  const prevRecombinantValue = useRef<boolean | undefined>();
  const prevHumanNhpValue = useRef<boolean | undefined>();

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
        wholePlants: false,
        largeScaleExperiments: false,
        influenzaViruses: false,
        geneDriveOrganisms: false,
      },
      nihSectionE: {
        limitedViralGenome: false,
        plantExperiments: false,
        transgenicRodents: false,
      },
      nihSectionF: {
        f1TissueCulture: false,
        f2EcoliK12: false,
        f3Saccharomyces: false,
        f4Kluyveromyces: false,
        f5Bacillus: false,
        f6GramPositive: false,
        f7TransgenicRodents: false,
        f8TransgenicBreeding: false,
      },
      nihAppendixC: {
        cI: false,
        cII: false,
        cIII: false,
        cIV: false,
        cV: false,
        cVI: false,
        cVII: false,
        cVIII: false,
        cIX: false,
      },
      hazardousProcedures: [],
      
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
      animalWork: false,
      fieldWork: false,
      
      // Human/NHP Section defaults
      humanOrigin: false,
      humanMaterials: [],
      humanMaterialsTissuesOther: "",
      humanMaterialsOtherMaterial: "",
      nonHumanPrimateOrigin: false,
      stemCells: [],
      cellLines: [],
      exposureControlPlanCompliance: false,
      handWashingDevice: false,
      laundryMethod: [],
      laundryMethodOther: "",
      materialsContainKnownPathogens: false,
      materialPathogenDetails: "",
      materialTreatmentDetails: "",
      infectionSymptoms: "",
      
      researchActivityIds: [],
      teamMembers: [],
    },
  });

  // Update form when data loads
  React.useEffect(() => {
    if (ibcApplication && associatedActivities) {
      // Set default collapsed state for hazardous procedures and synthetic experiments
      if (ibcApplication.hazardousProcedures && ibcApplication.hazardousProcedures.length > 0) {
        const collapsedIndices = new Set(ibcApplication.hazardousProcedures.map((_, index) => index));
        setCollapsedProcedures(collapsedIndices);
      }
      
      if (ibcApplication.syntheticExperiments && ibcApplication.syntheticExperiments.length > 0) {
        const collapsedIndices = new Set(ibcApplication.syntheticExperiments.map((_, index) => index));
        setCollapsedSyntheticExperiments(collapsedIndices);
      }
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
          wholePlants: false,
          largeScaleExperiments: false,
          influenzaViruses: false,
          geneDriveOrganisms: false,
        },
        nihSectionE: ibcApplication.nihSectionE || {
          limitedViralGenome: false,
          plantExperiments: false,
          transgenicRodents: false,
        },
        nihSectionF: ibcApplication.nihSectionF || {
          f1TissueCulture: false,
          f2EcoliK12: false,
          f3Saccharomyces: false,
          f4Kluyveromyces: false,
          f5Bacillus: false,
          f6GramPositive: false,
          f7TransgenicRodents: false,
          f8TransgenicBreeding: false,
        },
        nihAppendixC: ibcApplication.nihAppendixC || {
          cI: false,
          cII: false,
          cIII: false,
          cIV: false,
          cV: false,
          cVI: false,
          cVII: false,
          cVIII: false,
          cIX: false,
        },
        syntheticExperiments: ibcApplication.syntheticExperiments || [],
        
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
        animalWork: ibcApplication.animalWork || false,
        fieldWork: ibcApplication.fieldWork || false,
        
        // Human/NHP Section actual values
        humanOrigin: ibcApplication.humanOrigin || false,
        humanMaterials: ibcApplication.humanMaterials || [],
        humanMaterialsTissuesOther: ibcApplication.humanMaterialsTissuesOther || "",
        humanMaterialsOtherMaterial: ibcApplication.humanMaterialsOtherMaterial || "",
        nonHumanPrimateOrigin: ibcApplication.nonHumanPrimateOrigin || false,
        stemCells: ibcApplication.stemCells || [],
        cellLines: ibcApplication.cellLines || [],
        hazardousProcedures: ibcApplication.hazardousProcedures || [],
        exposureControlPlanCompliance: ibcApplication.exposureControlPlanCompliance || false,
        handWashingDevice: ibcApplication.handWashingDevice || false,
        laundryMethod: ibcApplication.laundryMethod || [],
        laundryMethodOther: ibcApplication.laundryMethodOther || "",
        materialsContainKnownPathogens: ibcApplication.materialsContainKnownPathogens || false,
        materialPathogenDetails: ibcApplication.materialPathogenDetails || "",
        materialTreatmentDetails: ibcApplication.materialTreatmentDetails || "",
        infectionSymptoms: ibcApplication.infectionSymptoms || "",
        
        researchActivityIds: associatedActivities.map(ra => ra.id) || [],
        teamMembers: [],
        
        // Additional Details actual values
        proposedBiosafetyLevels: ibcApplication.proposedBiosafetyLevels || {
          absl1: false,
          absl2a: false,
          absl2b: false,
          absl3: false,
          bsl1: false,
          bsl2a: false,
          bsl2b: false,
          bsl3: false,
        },
        hostOrganismDnaPropagation: ibcApplication.hostOrganismDnaPropagation || "",
        purificationMeasures: ibcApplication.purificationMeasures || "",
        providedRestrictionVectorMaps: ibcApplication.providedRestrictionVectorMaps,
        viralGenomeRegionsAltered: ibcApplication.viralGenomeRegionsAltered || "",
        assayingWildTypeViral: ibcApplication.assayingWildTypeViral,
        handleMoreThan10Liters: ibcApplication.handleMoreThan10Liters,
        geneDriveSystemCrispr: ibcApplication.geneDriveSystemCrispr,
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

  // Helper functions to check if tabs have data
  const hasNucleicAcidsData = () => {
    const syntheticExperiments = form.getValues('syntheticExperiments');
    return syntheticExperiments && syntheticExperiments.length > 0;
  };

  const hasHumanNhpData = () => {
    const humanOrigin = form.getValues('humanOrigin');
    const humanMaterials = form.getValues('humanMaterials');
    const cellLines = form.getValues('cellLines');
    const hazardousProcedures = form.getValues('hazardousProcedures');
    const stemCells = form.getValues('stemCells');
    const nonHumanPrimateOrigin = form.getValues('nonHumanPrimateOrigin');
    
    return (
      humanOrigin ||
      (humanMaterials && humanMaterials.length > 0) ||
      (cellLines && cellLines.length > 0) ||
      (hazardousProcedures && hazardousProcedures.length > 0) ||
      (stemCells && stemCells.length > 0) ||
      nonHumanPrimateOrigin
    );
  };

  // Data clearing functions
  const clearNucleicAcidsData = () => {
    form.setValue('syntheticExperiments', []);
    form.setValue('nihSectionABC', {
      requiresNihDirectorApproval: false,
      drugResistanceTraits: false,
      toxinMolecules: false,
      humanGeneTransfer: false,
      approvalDocuments: [],
    });
    form.setValue('nihSectionD', {
      riskGroup2Plus: false,
      pathogenDnaRna: false,
      infectiousViral: false,
      wholeAnimalExperiments: false,
      wholePlants: false,
      largeScaleExperiments: false,
      influenzaViruses: false,
      geneDriveOrganisms: false,
    });
    form.setValue('nihSectionE', {
      limitedViralGenome: false,
      plantExperiments: false,
      transgenicRodents: false,
    });
    form.setValue('nihSectionF', {
      f1TissueCulture: false,
      f2EcoliK12: false,
      f3Saccharomyces: false,
      f4Kluyveromyces: false,
      f5Bacillus: false,
      f6GramPositive: false,
      f7TransgenicRodents: false,
      f8TransgenicBreeding: false,
    });
    form.setValue('nihAppendixC', {
      cI: false,
      cII: false,
      cIII: false,
      cIV: false,
      cV: false,
      cVI: false,
      cVII: false,
      cVIII: false,
      cIX: false,
    });
    setNucleicAcidsConfirmDialog(false);
  };

  const clearHumanNhpData = () => {
    form.setValue('humanOrigin', false);
    form.setValue('humanMaterials', []);
    form.setValue('humanMaterialsTissuesOther', '');
    form.setValue('humanMaterialsOtherMaterial', '');
    form.setValue('nonHumanPrimateOrigin', false);
    form.setValue('stemCells', []);
    form.setValue('cellLines', []);
    form.setValue('hazardousProcedures', []);
    form.setValue('exposureControlPlanCompliance', false);
    form.setValue('handWashingDevice', false);
    form.setValue('laundryMethod', []);
    form.setValue('laundryMethodOther', '');
    form.setValue('materialsContainKnownPathogens', false);
    form.setValue('materialPathogenDetails', '');
    form.setValue('materialTreatmentDetails', '');
    form.setValue('infectionSymptoms', '');
    form.setValue('introducingPrimateMaterialIntoAnimals', false);
    setHumanNhpConfirmDialog(false);
  };

  // Watch for changes in the Basics tab questions
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Handle Recombinant/Synthetic Nucleic Acids toggle
      if (name === 'recombinantSyntheticNucleicAcid') {
        const currentValue = value.recombinantSyntheticNucleicAcid;
        const previousValue = prevRecombinantValue.current;
        
        // Check if transitioning from true to false
        if (previousValue === true && currentValue === false) {
          // Check if there's data in the Nucleic Acids tab
          if (hasNucleicAcidsData()) {
            // Show confirmation dialog
            setNucleicAcidsConfirmDialog(true);
            // Revert the toggle temporarily
            form.setValue('recombinantSyntheticNucleicAcid', true, { shouldValidate: false });
          }
        }
        
        prevRecombinantValue.current = currentValue;
      }
      
      // Handle Human/NHP Material toggle
      if (name === 'humanNonHumanPrimateMaterial') {
        const currentValue = value.humanNonHumanPrimateMaterial;
        const previousValue = prevHumanNhpValue.current;
        
        // Check if transitioning from true to false
        if (previousValue === true && currentValue === false) {
          // Check if there's data in the Human/NHP tab
          if (hasHumanNhpData()) {
            // Show confirmation dialog
            setHumanNhpConfirmDialog(true);
            // Revert the toggle temporarily
            form.setValue('humanNonHumanPrimateMaterial', true, { shouldValidate: false });
          }
        }
        
        prevHumanNhpValue.current = currentValue;
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Initialize previous values when data loads
  useEffect(() => {
    if (ibcApplication) {
      prevRecombinantValue.current = ibcApplication.recombinantSyntheticNucleicAcid;
      prevHumanNhpValue.current = ibcApplication.humanNonHumanPrimateMaterial;
    }
  }, [ibcApplication]);

  // Cell Line Dialog Handlers
  const openAddCellLineDialog = () => {
    setCellLineFormData({
      name: "",
      species: "",
      descriptor: "",
      biosafetyLevel: "",
      acquisitionSource: [],
      passage: "",
      exposedTo: [],
      willBeCultured: false,
    });
    setEditingCellLineIndex(null);
    setCellLineDialogOpen(true);
  };

  const openEditCellLineDialog = (index: number) => {
    const cellLines = form.getValues('cellLines') || [];
    const cellLine = cellLines[index];
    if (cellLine) {
      setCellLineFormData({
        name: cellLine.name,
        species: cellLine.species || "",
        descriptor: cellLine.descriptor || "",
        biosafetyLevel: cellLine.biosafetyLevel,
        acquisitionSource: cellLine.acquisitionSource || [],
        passage: cellLine.passage,
        exposedTo: cellLine.exposedTo || [],
        willBeCultured: cellLine.willBeCultured,
      });
      setEditingCellLineIndex(index);
      setCellLineDialogOpen(true);
    }
  };

  const saveCellLine = () => {
    // Validate required fields
    if (!cellLineFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Cell Line Name is required",
        variant: "destructive",
      });
      return;
    }
    if (!cellLineFormData.biosafetyLevel) {
      toast({
        title: "Validation Error",
        description: "Biosafety Level is required",
        variant: "destructive",
      });
      return;
    }
    if (cellLineFormData.acquisitionSource.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one Acquisition Source is required",
        variant: "destructive",
      });
      return;
    }
    if (!cellLineFormData.passage) {
      toast({
        title: "Validation Error",
        description: "Passage is required",
        variant: "destructive",
      });
      return;
    }
    if (cellLineFormData.exposedTo.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one exposure type is required",
        variant: "destructive",
      });
      return;
    }

    const currentCellLines = form.getValues('cellLines') || [];
    let updatedCellLines;
    
    if (editingCellLineIndex !== null) {
      // Edit existing cell line
      updatedCellLines = [...currentCellLines];
      updatedCellLines[editingCellLineIndex] = {
        ...cellLineFormData,
        id: currentCellLines[editingCellLineIndex].id || `temp-${Date.now()}`,
      };
      toast({
        title: "Success",
        description: "Cell line updated successfully",
      });
    } else {
      // Add new cell line
      updatedCellLines = [
        ...currentCellLines,
        {
          ...cellLineFormData,
          id: `temp-${Date.now()}`,
        }
      ];
      toast({
        title: "Success",
        description: "Cell line added successfully",
      });
    }
    
    form.setValue('cellLines', updatedCellLines);
    setCellLineDialogOpen(false);
  };

  const deleteCellLine = (index: number) => {
    if (window.confirm("Are you sure you want to delete this cell line?")) {
      const currentCellLines = form.getValues('cellLines') || [];
      const updatedCellLines = currentCellLines.filter((_, i) => i !== index);
      form.setValue('cellLines', updatedCellLines);
      toast({
        title: "Success",
        description: "Cell line deleted successfully",
      });
    }
  };

  // Hazardous Procedures Dialog Functions
  const openAddHazardousProcedureDialog = () => {
    setHazardousProcedureFormData({
      cellLineId: "",
      cellLineName: "",
      procedure: "",
      otherCellsDescription: "",
      engineeringControls: [],
      ppe: [],
      procedureDetails: "",
    });
    setEditingHazardousProcedureIndex(null);
    setHazardousProcedureDialogOpen(true);
  };

  const openEditHazardousProcedureDialog = (index: number) => {
    const hazardousProcedures = form.getValues('hazardousProcedures') || [];
    const procedure = hazardousProcedures[index];
    if (procedure) {
      setHazardousProcedureFormData({
        cellLineId: procedure.cellLineId,
        cellLineName: procedure.cellLineName,
        procedure: procedure.procedure,
        otherCellsDescription: procedure.otherCellsDescription || "",
        engineeringControls: procedure.engineeringControls || [],
        ppe: procedure.ppe || [],
        procedureDetails: procedure.procedureDetails,
      });
      setEditingHazardousProcedureIndex(index);
      setHazardousProcedureDialogOpen(true);
    }
  };

  const saveHazardousProcedure = () => {
    // Validate required fields
    if (!hazardousProcedureFormData.cellLineId) {
      toast({
        title: "Validation Error",
        description: "Please select a cell line",
        variant: "destructive",
      });
      return;
    }
    if (!hazardousProcedureFormData.procedure) {
      toast({
        title: "Validation Error",
        description: "Procedure is required",
        variant: "destructive",
      });
      return;
    }
    if (hazardousProcedureFormData.engineeringControls.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one Engineering Control is required",
        variant: "destructive",
      });
      return;
    }
    if (hazardousProcedureFormData.ppe.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one PPE item is required",
        variant: "destructive",
      });
      return;
    }
    if (!hazardousProcedureFormData.procedureDetails.trim()) {
      toast({
        title: "Validation Error",
        description: "Procedure Details are required",
        variant: "destructive",
      });
      return;
    }

    const currentProcedures = form.getValues('hazardousProcedures') || [];
    let updatedProcedures;
    
    if (editingHazardousProcedureIndex !== null) {
      // Edit existing procedure
      updatedProcedures = [...currentProcedures];
      const existingProcedure = updatedProcedures[editingHazardousProcedureIndex];
      updatedProcedures[editingHazardousProcedureIndex] = {
        ...hazardousProcedureFormData,
        id: existingProcedure?.id, // Keep existing id if present
      };
    } else {
      // Add new procedure
      updatedProcedures = [
        ...currentProcedures,
        {
          ...hazardousProcedureFormData,
          id: `temp-${Date.now()}`, // Temporary ID for new procedures
        },
      ];
    }
    
    form.setValue('hazardousProcedures', updatedProcedures);
    setHazardousProcedureDialogOpen(false);
    toast({
      title: "Success",
      description: editingHazardousProcedureIndex !== null ? "Hazardous procedure updated successfully" : "Hazardous procedure added successfully",
    });
  };

  const deleteHazardousProcedure = (index: number) => {
    if (window.confirm("Are you sure you want to delete this hazardous procedure?")) {
      const currentProcedures = form.getValues('hazardousProcedures') || [];
      const updatedProcedures = currentProcedures.filter((_, i) => i !== index);
      form.setValue('hazardousProcedures', updatedProcedures);
      toast({
        title: "Success",
        description: "Hazardous procedure deleted successfully",
      });
    }
  };

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
            <TabsList className="w-full justify-start overflow-x-auto px-6 gap-2" style={{scrollPaddingLeft: '24px', scrollPaddingRight: '24px'}}>
              <TabsTrigger value="basics" className="whitespace-nowrap flex-shrink-0">Basics</TabsTrigger>
              <TabsTrigger value="staff" className="whitespace-nowrap flex-shrink-0">Staff</TabsTrigger>
              <TabsTrigger value="overview" className="whitespace-nowrap flex-shrink-0">Overview</TabsTrigger>
              {form.watch('recombinantSyntheticNucleicAcid') && (
                <TabsTrigger value="nucleic-acids" className="whitespace-nowrap flex-shrink-0">
                  <span className="hidden lg:inline">Recombinant or Synthetic Nucleic Acids</span>
                  <span className="hidden sm:inline lg:hidden">Nucleic Acids</span>
                  <span className="sm:hidden">DNA/RNA</span>
                </TabsTrigger>
              )}
              {form.watch('humanNonHumanPrimateMaterial') && (
                <TabsTrigger value="human-nhp" className="whitespace-nowrap flex-shrink-0">Human/NHP</TabsTrigger>
              )}
              <TabsTrigger value="facilities" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Facilities</span>
                <span className="sm:hidden">Labs</span>
              </TabsTrigger>
              <TabsTrigger value="inactivation" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Inactivation & Decontamination</span>
                <span className="sm:hidden">Inactivation</span>
              </TabsTrigger>
              <TabsTrigger value="disposal" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Disposal</span>
                <span className="sm:hidden">Disposal</span>
              </TabsTrigger>
              <TabsTrigger value="transport" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Transport/Shipping</span>
                <span className="sm:hidden">Transport</span>
              </TabsTrigger>
              <TabsTrigger value="dual-use" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Dual Use</span>
                <span className="sm:hidden">Dual Use</span>
              </TabsTrigger>
              <TabsTrigger value="construction" className="whitespace-nowrap flex-shrink-0">
                <span className="hidden sm:inline">Under Construction</span>
                <span className="sm:hidden">Construction</span>
              </TabsTrigger>
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
                                    {pi.firstName} {pi.lastName} ({pi.title || "Researcher"})
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
                  </div>

                  {/* Legacy IDs Section */}
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Legacy IDs (optional)</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                          name="irbnetIbcNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IRBnet IBC Number</FormLabel>
                              <FormControl>
                                <Input placeholder="IRBnet IBC number" {...field} disabled={isReadOnly} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                      name="animalWork"
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
                              disabled={isReadOnly}
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

            <TabsContent value="nucleic-acids" className="space-y-6 mt-6">
              {/* Secondary navigation for nucleic acids sub-tabs */}
              <Tabs defaultValue="nih-guidelines" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto px-6 gap-2" style={{scrollPaddingLeft: '24px', scrollPaddingRight: '24px'}}>
                  <TabsTrigger value="nih-guidelines" className="whitespace-nowrap flex-shrink-0">NIH Guidelines</TabsTrigger>
                  <TabsTrigger value="synthetic-experiments" className="whitespace-nowrap flex-shrink-0">Synthetic Experiments</TabsTrigger>
                  <TabsTrigger value="additional-details" className="whitespace-nowrap flex-shrink-0">Additional Details</TabsTrigger>
                </TabsList>

                <TabsContent value="nih-guidelines" className="space-y-6 mt-6">
                  {/* NIH Section III-A/B/C - High Risk Experiments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-red-800">NIH Section III-A/B/C</CardTitle>
                  <CardDescription className="text-red-600">
                    Experiments requiring additional federal approvals and IBC approval before initiation
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
                              Requires federal approval process + IBC approval (contact institution's biosafety office)
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
                              III-B: Cloning toxin molecules with LD50 &lt; 100 ng/kg body weight
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Requires NIH Office of Science Policy review + IBC approval
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
                              III-C: Human gene transfer experiments (clinical trials)
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Requires IBC approval + IRB approval + regulatory compliance
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
                    Experiments that require Institutional Biosafety Committee approval before initiation
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
                              III-D-1: Using Risk Group 2, 3, 4, or restricted agents as host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Risk assessment determines appropriate biosafety level
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
                              III-D-2: DNA from Risk Group 2, 3, 4, or restricted agents in nonpathogenic hosts
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Cloning pathogen DNA into nonpathogenic prokaryotic or lower eukaryotic systems
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
                              III-D-3: Infectious DNA or RNA viruses in tissue culture systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Including defective DNA or RNA viruses in presence of helper virus
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
                              III-D-4: Experiments involving whole animals
                            </FormLabel>
                            <FormDescription className="text-xs">
                              All experiments with recombinant/synthetic nucleic acids in whole animals
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.wholePlants"
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
                              III-D-5: Experiments involving whole plants
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Recombinant/synthetic nucleic acids in whole plants (requires BL1-P, BL2-P, BL3-P, or BL4-P containment)
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
                              III-D-6: Experiments involving more than 10 liters of culture
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Large-scale research or production activities
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionD.influenzaViruses"
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
                              III-D-7: Experiments involving influenza viruses
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Research with influenza viruses (specific containment requirements apply)
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
                              III-D-8: Experiments involving gene drive modified organisms
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Minimum BL2 (microbes), BL2-N (animals), or BL2-P (plants) containment
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
                    Experiments that require Institutional Biosafety Committee notice simultaneous with initiation
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
                              III-E-1: Recombinant nucleic acids containing no more than 2/3 of eukaryotic virus genome
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Must demonstrate that cells lack helper virus and cannot produce infectious virus
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
                              III-E-2: Experiments involving whole plants
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Plant experiments not covered under Section III-D-5 (IBC approval required)
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
                              III-E-3: Experiments involving transgenic rodents
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Generation and use of transgenic rodents that require BL1 containment only
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
                    Exempt experiments (not subject to NIH Guidelines but may require institutional oversight)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihSectionF.f1TissueCulture"
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
                              III-F-1: Recombinant/synthetic nucleic acid molecules in tissue culture
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Tissue culture experiments (with specific exceptions listed in Appendix C-I-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f2EcoliK12"
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
                              III-F-2: E. coli K-12 host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Using certified E. coli K-12 systems (with specific exceptions listed in Appendix C-II-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f3Saccharomyces"
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
                              III-F-3: Saccharomyces cerevisiae and S. uvarum host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Using certified Saccharomyces systems (with specific exceptions listed in Appendix C-III-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f4Kluyveromyces"
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
                              III-F-4: Kluyveromyces lactis host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Using certified Kluyveromyces lactis systems (with specific exceptions listed in Appendix C-IV-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f5Bacillus"
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
                              III-F-5: Bacillus subtilis or B. licheniformis host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Using certified Bacillus systems (with specific exceptions listed in Appendix C-V-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f6GramPositive"
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
                              III-F-6: Extrachromosomal elements of gram-positive organisms
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Natural exchangers from Appendix A sublists (with specific exceptions listed in Appendix C-VI-A)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f7TransgenicRodents"
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
                              III-F-7: Purchase or transfer of transgenic rodents
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Acquisition of existing transgenic rodents (see Appendix C-VII for details)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.f8TransgenicBreeding"
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
                              III-F-8: Generation of BL1 transgenic rodents via breeding
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Breeding transgenic rodents that require only BL1 containment (see Appendix C-VIII)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">Important Exemption Limitations</h4>
                      <p className="text-xs text-yellow-700">
                        These exemptions do NOT apply to: (1) experiments involving &gt;10 liters of culture, 
                        (2) experiments with DNA from Risk Groups 3, 4, or restricted organisms, 
                        (3) deliberate cloning of toxin genes with LD50 &lt; 100 ng/kg, or 
                        (4) experiments involving gene drive modified organisms.
                      </p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="nihSectionF.exemptionJustification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exemption Justification</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="If any exemptions apply, provide specific justification and reference the relevant appendix (C-I through C-VIII)..."
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
                  </div>
                </CardContent>
              </Card>

              {/* NIH Appendix C - Exemptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-800">Appendix C - Exemptions Under Section III-F-8</CardTitle>
                  <CardDescription className="text-blue-600">
                    Specific exemption categories and containment conditions for certified host-vector systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cI"
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
                              C-I: Recombinant/synthetic nucleic acid molecules in tissue culture
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Specific containment conditions for tissue culture systems (see C-I-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cII"
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
                              C-II: Escherichia coli K-12 host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Certified E. coli K-12 systems and containment requirements (see C-II-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cIII"
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
                              C-III: Saccharomyces host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Saccharomyces cerevisiae and S. uvarum systems (see C-III-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cIV"
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
                              C-IV: Kluyveromyces host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Kluyveromyces lactis systems and containment conditions (see C-IV-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cV"
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
                              C-V: Bacillus subtilis or B. licheniformis host-vector systems
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Certified Bacillus systems and safety requirements (see C-V-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cVI"
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
                              C-VI: Extrachromosomal elements of gram-positive organisms
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Natural exchangers and plasmid systems (see C-VI-A for exceptions)
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cVII"
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
                              C-VII: Purchase or transfer of transgenic rodents
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Acquisition and transfer conditions for existing transgenic rodents
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cVIII"
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
                              C-VIII: Generation of BL1 transgenic rodents via breeding
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Breeding protocols for transgenic rodents requiring only BL1 containment
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nihAppendixC.cIX"
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
                              C-IX: Footnotes and references of Appendix C
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Additional clarifications and references for exemption categories
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="nihAppendixC.additionalConsiderations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Containment Considerations</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any specific containment conditions, host-vector certifications, or special considerations relevant to the exemption categories selected above..."
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
                </CardContent>
              </Card>
                </TabsContent>

                <TabsContent value="synthetic-experiments" className="space-y-6 mt-6">
                  {/* Synthetic Experiments Section */}
                  {!isReadOnly && form.watch('syntheticExperiments')?.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No synthetic experiments added yet.</p>
                      <Button
                        type="button"
                        onClick={() => {
                          form.setValue('syntheticExperiments', [{
                            backboneSource: "",
                            vectorInsertName: "",
                            vectorInsert: "",
                            insertedDnaSource: "",
                            dnaSequenceNature: {
                              anonymousMarker: false,
                              genomicDNA: false,
                              toxinGene: false,
                              cDNA: false,
                              snRNAsiRNA: false,
                              other: false,
                            },
                            anticipatedEffect: {
                              antiApoptotic: false,
                              cytokineInducer: false,
                              cytokineInhibitor: false,
                              growthFactor: false,
                              oncogene: false,
                              toxic: false,
                              tumorInducer: false,
                              tumorInhibitor: false,
                              otherSpecify: "",
                            },
                            viralGenomeFraction: "",
                            replicationCompetent: "",
                            packagingCellLines: "",
                            tropism: "",
                            exposedTo: {
                              arthropods: false,
                              cellCulture: false,
                              humans: false,
                              invertebrateAnimals: false,
                              microOrganism: false,
                              none: false,
                              plantsTransgenicPlants: false,
                              vertebrateAnimals: false,
                            },
                            vectorSource: {
                              researchCollaborator: false,
                              commercialVendor: false,
                              institutionLab: false,
                              otherSource: false,
                            },
                            organismName: "",
                            organismSource: {
                              library: false,
                              pcr: false,
                              syntheticOligo: false,
                              other: false,
                            },
                          }]);
                          // Set to collapsed by default
                          setCollapsedSyntheticExperiments(new Set([0]));
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Synthetic Experiment
                      </Button>
                    </div>
                  )}

                  {form.watch('syntheticExperiments')?.map((experiment, index) => {
                    const isCollapsed = collapsedSyntheticExperiments.has(index);
                    const backboneSource = form.watch(`syntheticExperiments.${index}.backboneSource`) || "Not selected";
                    
                    return (
                    <Card key={index} className="relative">
                      <CardHeader 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          const newCollapsed = new Set(collapsedSyntheticExperiments);
                          if (isCollapsed) {
                            newCollapsed.delete(index);
                          } else {
                            newCollapsed.add(index);
                          }
                          setCollapsedSyntheticExperiments(newCollapsed);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <CardTitle className="text-lg">Synthetic Experiment #{index + 1}</CardTitle>
                            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {backboneSource}
                            </span>
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {!isReadOnly && form.watch('syntheticExperiments')?.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentExperiments = form.getValues('syntheticExperiments') || [];
                                  const newExperiments = currentExperiments.filter((_, i) => i !== index);
                                  form.setValue('syntheticExperiments', newExperiments);
                                  const newCollapsed = new Set(collapsedSyntheticExperiments);
                                  newCollapsed.delete(index);
                                  setCollapsedSyntheticExperiments(newCollapsed);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!isReadOnly && index === form.watch('syntheticExperiments')?.length - 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const currentExperiments = form.getValues('syntheticExperiments') || [];
                                  const newExperiment = {
                                    backboneSource: "",
                                    vectorInsertName: "",
                                    vectorInsert: "",
                                    insertedDnaSource: "",
                                    dnaSequenceNature: {
                                      anonymousMarker: false,
                                      genomicDNA: false,
                                      toxinGene: false,
                                      cDNA: false,
                                      snRNAsiRNA: false,
                                      other: false,
                                    },
                                    anticipatedEffect: {
                                      antiApoptotic: false,
                                      cytokineInducer: false,
                                      cytokineInhibitor: false,
                                      growthFactor: false,
                                      oncogene: false,
                                      toxic: false,
                                      tumorInducer: false,
                                      tumorInhibitor: false,
                                      otherSpecify: "",
                                    },
                                    viralGenomeFraction: "",
                                    replicationCompetent: "",
                                    packagingCellLines: "",
                                    tropism: "",
                                    exposedTo: {
                                      arthropods: false,
                                      cellCulture: false,
                                      humans: false,
                                      invertebrateAnimals: false,
                                      microOrganism: false,
                                      none: false,
                                      plantsTransgenicPlants: false,
                                      vertebrateAnimals: false,
                                    },
                                    vectorSource: {
                                      researchCollaborator: false,
                                      commercialVendor: false,
                                      institutionLab: false,
                                      otherSource: false,
                                    },
                                    organismName: "",
                                    organismSource: {
                                      library: false,
                                      pcr: false,
                                      syntheticOligo: false,
                                      other: false,
                                    },
                                  };
                                  form.setValue('syntheticExperiments', [...currentExperiments, newExperiment]);
                                  // Set new experiment to collapsed by default
                                  const newCollapsed = new Set(collapsedSyntheticExperiments);
                                  newCollapsed.add(currentExperiments.length);
                                  setCollapsedSyntheticExperiments(newCollapsed);
                                }}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {!isCollapsed && (
                      <CardContent className="space-y-6">
                        
                        {/* Vector Information Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.backboneSource`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Backbone Source <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    disabled={isReadOnly}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                  >
                                    <option value="">Select backbone source...</option>
                                    <option value="adenoviral">Adenoviral</option>
                                    <option value="bacteria">Bacteria</option>
                                    <option value="ecoli">E.coli</option>
                                    <option value="fiv">FIV</option>
                                    <option value="hiv">HIV</option>
                                    <option value="lentivirus">Lentivirus</option>
                                    <option value="mlv">MLV</option>
                                    <option value="plasmids">Plasmids</option>
                                    <option value="retrovirus">Retrovirus</option>
                                    <option value="rotavirus">Rotavirus</option>
                                    <option value="vaccinia">Vaccinia</option>
                                    <option value="yeast">Yeast</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.vectorInsertName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vector/Insert Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    disabled={isReadOnly}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                  >
                                    <option value="">Select vector/insert name...</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`syntheticExperiments.${index}.vectorInsert`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vector/Insert <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter vector/insert details..."
                                  {...field}
                                  disabled={isReadOnly}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`syntheticExperiments.${index}.insertedDnaSource`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name of Inserted DNA and Source (species/strain) <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe the inserted DNA and its source, including species and strain information..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                  disabled={isReadOnly}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Nature of DNA Sequences */}
                        <div>
                          <FormLabel className="text-base font-semibold mb-3 block">Nature of DNA Sequences <span className="text-red-500">*</span></FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { key: 'anonymousMarker', label: 'Anonymous Marker' },
                              { key: 'genomicDNA', label: 'Genomic DNA' },
                              { key: 'toxinGene', label: 'Toxin Gene' },
                              { key: 'cDNA', label: 'cDNA' },
                              { key: 'snRNAsiRNA', label: 'snRNA/siRNA' },
                              { key: 'other', label: 'Other' },
                            ].map(({ key, label }) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={`syntheticExperiments.${index}.dnaSequenceNature.${key}`}
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
                                    <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Anticipated Effect of the Insert */}
                        <div>
                          <FormLabel className="text-base font-semibold mb-3 block">Anticipated Effect of the Insert <span className="text-red-500">*</span></FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { key: 'antiApoptotic', label: 'Anti-apoptotic' },
                              { key: 'cytokineInducer', label: 'Cytokine Inducer' },
                              { key: 'cytokineInhibitor', label: 'Cytokine Inhibitor' },
                              { key: 'growthFactor', label: 'Growth Factor' },
                              { key: 'oncogene', label: 'Oncogene' },
                              { key: 'toxic', label: 'Toxic' },
                              { key: 'tumorInducer', label: 'Tumor Inducer' },
                              { key: 'tumorInhibitor', label: 'Tumor Inhibitor' },
                            ].map(({ key, label }) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={`syntheticExperiments.${index}.anticipatedEffect.${key}`}
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
                                    <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.anticipatedEffect.otherSpecify`}
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel>Other (specify)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Specify other anticipated effects..."
                                    {...field}
                                    disabled={isReadOnly}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Viral Genome and Replication */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.viralGenomeFraction`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>What is the Largest Fraction of the Eukaryotic Viral Genome Contained in the rDNA Molecules?</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    disabled={isReadOnly}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                  >
                                    <option value="">Select fraction...</option>
                                    <option value="<1/2">&lt; 1/2</option>
                                    <option value=">1/2 but <2/3">&gt; 1/2 but &lt; 2/3</option>
                                    <option value=">2/3">&gt; 2/3</option>
                                    <option value="n/a">n/a</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.replicationCompetent`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Is the Vector Designed to be Replication Competent?</FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        value="yes"
                                        checked={field.value === "yes"}
                                        onChange={() => field.onChange("yes")}
                                        disabled={isReadOnly}
                                        className="form-radio"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        value="no"
                                        checked={field.value === "no"}
                                        onChange={() => field.onChange("no")}
                                        disabled={isReadOnly}
                                        className="form-radio"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`syntheticExperiments.${index}.packagingCellLines`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name of Packaging Cell Line(s) or Helper Plasmids used in Co-transfection to Produce Viral Particles</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter packaging cell lines or helper plasmids information..."
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                  disabled={isReadOnly}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`syntheticExperiments.${index}.tropism`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tropism (i.e. what species of cells can the virus infect?)</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  disabled={isReadOnly}
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                  <option value="">Select tropism...</option>
                                  <option value="ecotropic">Ecotropic (Rodents)</option>
                                  <option value="anthropic">Anthropic (mammals)</option>
                                  <option value="pantropic">Pantropic (all animals including insects, birds, fish)</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* What will be Exposed to the rDNA */}
                        <div>
                          <FormLabel className="text-base font-semibold mb-3 block">What will be Exposed to the rDNA (check all applicable)? <span className="text-red-500">*</span></FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { key: 'arthropods', label: 'Arthropods' },
                              { key: 'cellCulture', label: 'Cell Culture' },
                              { key: 'humans', label: 'Humans' },
                              { key: 'invertebrateAnimals', label: 'Invertebrate Animals' },
                              { key: 'microOrganism', label: 'Micro Organism' },
                              { key: 'none', label: 'None' },
                              { key: 'plantsTransgenicPlants', label: 'Plants or Transgenic Plants' },
                              { key: 'vertebrateAnimals', label: 'Vertebrate Animals' },
                            ].map(({ key, label }) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={`syntheticExperiments.${index}.exposedTo.${key}`}
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
                                    <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Vector Source */}
                        <div>
                          <FormLabel className="text-base font-semibold mb-3 block">Who will the Vector/Insert be Acquired from?</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { key: 'researchCollaborator', label: 'Acquired from a Research Collaborator' },
                              { key: 'commercialVendor', label: 'Commercial Vendor' },
                              { key: 'institutionLab', label: 'Developed/Created in my Institution Lab' },
                              { key: 'otherSource', label: 'Other Source' },
                            ].map(({ key, label }) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={`syntheticExperiments.${index}.vectorSource.${key}`}
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
                                    <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Organism Information */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={`syntheticExperiments.${index}.organismName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organism Name</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter organism name..."
                                    {...field}
                                    disabled={isReadOnly}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div>
                            <FormLabel className="text-base font-semibold mb-3 block">Organism Source <span className="text-red-500">*</span></FormLabel>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'library', label: 'Library' },
                                { key: 'pcr', label: 'PCR' },
                                { key: 'syntheticOligo', label: 'Synthetic Oligo' },
                                { key: 'other', label: 'Other' },
                              ].map(({ key, label }) => (
                                <FormField
                                  key={key}
                                  control={form.control}
                                  name={`syntheticExperiments.${index}.organismSource.${key}`}
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
                                      <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                      </CardContent>
                      )}
                    </Card>
                    );
                  })}
                </TabsContent>

                <TabsContent value="additional-details" className="space-y-6 mt-6">
                  {/* Additional Details Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Details</CardTitle>
                      <CardDescription>Additional information about biosafety level, procedures, and controls</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      {/* Proposed Biosafety Level */}
                      <div>
                        <FormLabel className="text-sm font-medium mb-4 block">
                          What is the proposed Biosafety Level? <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'absl1', label: 'ABSL 1' },
                            { key: 'absl2a', label: 'ABSL 2A' },
                            { key: 'absl2b', label: 'ABSL 2B' },
                            { key: 'absl3', label: 'ABSL 3' },
                            { key: 'bsl1', label: 'BSL 1' },
                            { key: 'bsl2a', label: 'BSL 2A' },
                            { key: 'bsl2b', label: 'BSL 2B' },
                            { key: 'bsl3', label: 'BSL 3' },
                          ].map(({ key, label }) => (
                            <FormField
                              key={key}
                              control={form.control}
                              name={`proposedBiosafetyLevels.${key}`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value || false}
                                      onChange={field.onChange}
                                      disabled={isReadOnly}
                                      className="rounded border-gray-300"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Host organism for DNA propagation */}
                      <FormField
                        control={form.control}
                        name="hostOrganismDnaPropagation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              What host organism will you use for DNA propagation? List the species and strain (i.e. E.coli DH5α) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="List the species and strain (e.g., E.coli DH5α)..."
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

                      {/* Purification measures */}
                      <FormField
                        control={form.control}
                        name="purificationMeasures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              How will you purify the recombinants and what measures will you take to avoid aerosol production during purification? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe purification methods and aerosol prevention measures..."
                                className="resize-none"
                                rows={4}
                                {...field}
                                value={field.value || ""}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Provided restriction/vector maps */}
                      <FormField
                        control={form.control}
                        name="providedRestrictionVectorMaps"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Have you provided restriction/vector maps for each vector listed above to the Biosafety Office? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-6">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="providedRestrictionVectorMaps"
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="providedRestrictionVectorMaps"
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Viral genome regions altered */}
                      <FormField
                        control={form.control}
                        name="viralGenomeRegionsAltered"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              What regions/genes of the viral genome are deleted or altered (if any) to produce the viral vector? (i.e. what is the basis of vector attenuation or replication incompetence, if any) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe deleted or altered viral genome regions and basis of attenuation..."
                                className="resize-none"
                                rows={4}
                                {...field}
                                value={field.value || ""}
                                disabled={isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Assaying for wild-type viral particles */}
                      <FormField
                        control={form.control}
                        name="assayingWildTypeViral"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Will you be assaying for the production of wild-type/helper/replication competent viral particles? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-6">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="assayingWildTypeViral"
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="assayingWildTypeViral"
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Handle more than 10 liters */}
                      <FormField
                        control={form.control}
                        name="handleMoreThan10Liters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Will you handle more than 10 liters of culture of this agent(s) at any one time? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-6">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="handleMoreThan10Liters"
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="handleMoreThan10Liters"
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Gene drive system */}
                      <FormField
                        control={form.control}
                        name="geneDriveSystemCrispr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Will this be used to create a gene drive system (then describe the types of systems we mean is CRISPR)? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-6">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="geneDriveSystemCrispr"
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>Yes</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name="geneDriveSystemCrispr"
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    disabled={isReadOnly}
                                    className="rounded-full"
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </TabsContent>

            {/* Human/NHP Section */}
            <TabsContent value="human-nhp" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Human/NHP Materials</CardTitle>
                  <CardDescription>Information about human and non-human primate materials, exposure control, and additional details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="materials-info" className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto px-6 gap-2" style={{scrollPaddingLeft: '24px', scrollPaddingRight: '24px'}}>
                      <TabsTrigger value="materials-info" className="whitespace-nowrap flex-shrink-0">Materials Info</TabsTrigger>
                      <TabsTrigger value="cell-lines" className="whitespace-nowrap flex-shrink-0">Cell Lines</TabsTrigger>
                      <TabsTrigger value="hazardous-procedures" className="whitespace-nowrap flex-shrink-0">Hazardous Procedures</TabsTrigger>
                      <TabsTrigger value="exposure-control" className="whitespace-nowrap flex-shrink-0">Exposure Control Plan</TabsTrigger>
                      <TabsTrigger value="additional-detail" className="whitespace-nowrap flex-shrink-0">Additional Detail</TabsTrigger>
                    </TabsList>

                    {/* Materials Info Subtab */}
                    <TabsContent value="materials-info" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        {/* Human Origin */}
                        <FormField
                          control={form.control}
                          name="humanOrigin"
                          render={({ field }) => (
                            <FormItem className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value || false}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600"
                                    data-testid="checkbox-human-origin"
                                  />
                                </FormControl>
                                <FormLabel className="font-medium cursor-pointer">Human Origin</FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Human Materials */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                          <h4 className="font-medium">Human Materials (check all applicable) <span className="text-red-500">*</span></h4>
                          <FormField
                            control={form.control}
                            name="humanMaterials"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {[
                                      'Amniotic Fluid', 'Blood', 'Bones', 'Breast Milk',
                                      'Cerebrospinal Fluid', 'Feces', 'Gingival Fluid', 'Nasal Secretions',
                                      'Pericardial Fluid', 'Peritoneal Fluid', 'Pleural Fluid', 'Semen',
                                      'Sputum', 'Sweat', 'Tears', 'Tissues (List below)',
                                      'Urine', 'Vaginal Secretions', 'Other Material (List below)'
                                    ].map((material) => (
                                      <div key={material} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`material-${material}`}
                                          checked={field.value?.includes(material) || false}
                                          disabled={isReadOnly}
                                          onChange={(e) => {
                                            const currentValues = field.value || [];
                                            if (e.target.checked) {
                                              field.onChange([...currentValues, material]);
                                            } else {
                                              field.onChange(currentValues.filter((v: string) => v !== material));
                                            }
                                          }}
                                          className="w-4 h-4 text-blue-600"
                                          data-testid={`checkbox-material-${material.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                        />
                                        <label htmlFor={`material-${material}`} className="text-sm cursor-pointer">{material}</label>
                                      </div>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Conditional text fields for Tissues and Other Material */}
                          {Array.isArray(form.watch('humanMaterials')) && form.watch('humanMaterials')?.includes('Tissues (List below)') && (
                            <FormField
                              control={form.control}
                              name="humanMaterialsTissuesOther"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>List Tissues</FormLabel>
                                  <FormControl>
                                    <textarea
                                      {...field}
                                      value={field.value || ''}
                                      disabled={isReadOnly}
                                      className="w-full min-h-[80px] p-2 border rounded-md"
                                      placeholder="Please list the tissues..."
                                      data-testid="textarea-tissues-list"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          {Array.isArray(form.watch('humanMaterials')) && form.watch('humanMaterials')?.includes('Other Material (List below)') && (
                            <FormField
                              control={form.control}
                              name="humanMaterialsOtherMaterial"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>List Other Material</FormLabel>
                                  <FormControl>
                                    <textarea
                                      {...field}
                                      value={field.value || ''}
                                      disabled={isReadOnly}
                                      className="w-full min-h-[80px] p-2 border rounded-md"
                                      placeholder="Please list other materials..."
                                      data-testid="textarea-other-material-list"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        {/* Non-human Primate Origin */}
                        <FormField
                          control={form.control}
                          name="nonHumanPrimateOrigin"
                          render={({ field }) => (
                            <FormItem className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value || false}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600"
                                    data-testid="checkbox-non-human-primate-origin"
                                  />
                                </FormControl>
                                <FormLabel className="font-medium cursor-pointer">Non-human Primate Origin</FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stem Cells */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                          <h4 className="font-medium">Stem Cells (check all applicable boxes)</h4>
                          <FormField
                            control={form.control}
                            name="stemCells"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-3">
                                    {[
                                      'Embryonic Stem Cells',
                                      'Induced Pluripotent Stem Cells (iPSCs)',
                                      'Mesenchymal Stem Cells (MSCs)'
                                    ].map((stemCell) => (
                                      <div key={stemCell} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`stemcell-${stemCell}`}
                                          checked={field.value?.includes(stemCell) || false}
                                          disabled={isReadOnly}
                                          onChange={(e) => {
                                            const currentValues = field.value || [];
                                            if (e.target.checked) {
                                              field.onChange([...currentValues, stemCell]);
                                            } else {
                                              field.onChange(currentValues.filter((v: string) => v !== stemCell));
                                            }
                                          }}
                                          className="w-4 h-4 text-blue-600"
                                          data-testid={`checkbox-stemcell-${stemCell.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                        />
                                        <label htmlFor={`stemcell-${stemCell}`} className="text-sm cursor-pointer">{stemCell}</label>
                                      </div>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Cell Lines Subtab */}
                    <TabsContent value="cell-lines" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Cell Lines</h3>
                          {!isReadOnly && (
                            <Button
                              type="button"
                              onClick={openAddCellLineDialog}
                              className="flex items-center gap-2"
                              data-testid="button-add-cell-line"
                            >
                              <Plus className="w-4 h-4" />
                              Add Cell Line
                            </Button>
                          )}
                        </div>

                        {form.watch('cellLines')?.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No cell lines added yet. Click "Add Cell Line" to get started.
                          </div>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Cell Line Name</TableHead>
                                  <TableHead>Species</TableHead>
                                  <TableHead>Biosafety Level</TableHead>
                                  <TableHead>Cultured</TableHead>
                                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {form.watch('cellLines')?.map((cellLine, index) => (
                                  <TableRow key={index} data-testid={`row-cell-line-${index}`}>
                                    <TableCell className="font-medium">{cellLine.name}</TableCell>
                                    <TableCell>{cellLine.species || '-'}</TableCell>
                                    <TableCell>{cellLine.biosafetyLevel}</TableCell>
                                    <TableCell>{cellLine.willBeCultured ? 'Yes' : 'No'}</TableCell>
                                    {!isReadOnly && (
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditCellLineDialog(index)}
                                            className="flex items-center gap-1"
                                            data-testid={`button-edit-cell-line-${index}`}
                                          >
                                            <Pencil className="w-4 h-4" />
                                            Edit
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteCellLine(index)}
                                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                            data-testid={`button-delete-cell-line-${index}`}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Cell Line Dialog */}
                        <Dialog open={cellLineDialogOpen} onOpenChange={setCellLineDialogOpen}>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {editingCellLineIndex !== null ? 'Edit Cell Line' : 'Add Cell Line'}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 py-4">
                              {/* Cell Line Name */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Cells/Cell Line Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  value={cellLineFormData.name}
                                  onChange={(e) => setCellLineFormData({...cellLineFormData, name: e.target.value})}
                                  placeholder="Enter cell line name"
                                  data-testid="input-cell-line-name"
                                />
                              </div>

                              {/* Species of Origin */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Species of Origin</label>
                                <Textarea
                                  value={cellLineFormData.species}
                                  onChange={(e) => setCellLineFormData({...cellLineFormData, species: e.target.value})}
                                  placeholder="Enter species of origin"
                                  className="min-h-[80px]"
                                  data-testid="textarea-species"
                                />
                              </div>

                              {/* Descriptor (Type of Cell Line) */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Descriptor (Type of Cell Line)</label>
                                <Textarea
                                  value={cellLineFormData.descriptor}
                                  onChange={(e) => setCellLineFormData({...cellLineFormData, descriptor: e.target.value})}
                                  placeholder="Enter descriptor"
                                  className="min-h-[80px]"
                                  data-testid="textarea-descriptor"
                                />
                              </div>

                              {/* Select Bio-safety Level */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Select Bio-safety Level <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={cellLineFormData.biosafetyLevel}
                                  onValueChange={(value) => setCellLineFormData({...cellLineFormData, biosafetyLevel: value})}
                                >
                                  <SelectTrigger data-testid="select-biosafety-level">
                                    <SelectValue placeholder="Select biosafety level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="BSL-1">BSL-1</SelectItem>
                                    <SelectItem value="BSL-2">BSL-2</SelectItem>
                                    <SelectItem value="BSL-3">BSL-3</SelectItem>
                                    <SelectItem value="BSL-4">BSL-4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Acquisition Source */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Acquisition Source <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                  {[
                                    'Acquired from a Research Collaborator',
                                    'Commercial Vendor',
                                    'Developed/Created in my Institution Lab',
                                    'Other Source'
                                  ].map((source) => (
                                    <div key={source} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`acquisition-${source}`}
                                        checked={cellLineFormData.acquisitionSource.includes(source)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setCellLineFormData({
                                              ...cellLineFormData,
                                              acquisitionSource: [...cellLineFormData.acquisitionSource, source]
                                            });
                                          } else {
                                            setCellLineFormData({
                                              ...cellLineFormData,
                                              acquisitionSource: cellLineFormData.acquisitionSource.filter(s => s !== source)
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid={`checkbox-acquisition-${source.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                      />
                                      <label htmlFor={`acquisition-${source}`} className="text-sm cursor-pointer">{source}</label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Passage */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Passage <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={cellLineFormData.passage}
                                  onValueChange={(value) => setCellLineFormData({...cellLineFormData, passage: value})}
                                >
                                  <SelectTrigger data-testid="select-passage">
                                    <SelectValue placeholder="Select passage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="P0">P0</SelectItem>
                                    <SelectItem value="P1">P1</SelectItem>
                                    <SelectItem value="P2">P2</SelectItem>
                                    <SelectItem value="P3">P3</SelectItem>
                                    <SelectItem value="P4">P4</SelectItem>
                                    <SelectItem value="P5">P5</SelectItem>
                                    <SelectItem value="P6+">P6+</SelectItem>
                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* What will be Exposed to the Cell Line */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  What will be Exposed to the Cell Line (check all applicable)? <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-2">
                                  {[
                                    'Arthropods',
                                    'Cell Culture',
                                    'Humans',
                                    'Invertebrate Animals',
                                    'Micro Organism',
                                    'None',
                                    'Plants or Transgenic Plants',
                                    'Vertebrate Animals'
                                  ].map((exposure) => (
                                    <div key={exposure} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`exposure-${exposure}`}
                                        checked={cellLineFormData.exposedTo.includes(exposure)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setCellLineFormData({
                                              ...cellLineFormData,
                                              exposedTo: [...cellLineFormData.exposedTo, exposure]
                                            });
                                          } else {
                                            setCellLineFormData({
                                              ...cellLineFormData,
                                              exposedTo: cellLineFormData.exposedTo.filter(ex => ex !== exposure)
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid={`checkbox-exposure-${exposure.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                      />
                                      <label htmlFor={`exposure-${exposure}`} className="text-sm cursor-pointer">{exposure}</label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Will this be Cultured? */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Will this be Cultured? <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center space-x-6">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="willBeCultured"
                                      checked={cellLineFormData.willBeCultured === true}
                                      onChange={() => setCellLineFormData({...cellLineFormData, willBeCultured: true})}
                                      className="w-4 h-4 text-blue-600"
                                      data-testid="radio-cultured-yes"
                                    />
                                    <span>Yes</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="willBeCultured"
                                      checked={cellLineFormData.willBeCultured === false}
                                      onChange={() => setCellLineFormData({...cellLineFormData, willBeCultured: false})}
                                      className="w-4 h-4 text-blue-600"
                                      data-testid="radio-cultured-no"
                                    />
                                    <span>No</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCellLineDialogOpen(false)}
                                data-testid="button-cancel-cell-line"
                              >
                                Cancel changes
                              </Button>
                              <Button
                                type="button"
                                onClick={saveCellLine}
                                data-testid="button-save-cell-line"
                              >
                                Save changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TabsContent>

                    {/* Hazardous Procedures Subtab */}
                    <TabsContent value="hazardous-procedures" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Hazardous Procedures</h3>
                          {!isReadOnly && (
                            <Button
                              type="button"
                              onClick={openAddHazardousProcedureDialog}
                              className="flex items-center gap-2"
                              data-testid="button-add-hazardous-procedure"
                            >
                              <Plus className="w-4 h-4" />
                              Add Hazardous Procedure
                            </Button>
                          )}
                        </div>

                        {form.watch('hazardousProcedures')?.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No hazardous procedures added yet. Click "Add Hazardous Procedure" to get started.
                          </div>
                        ) : (
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Cell Line</TableHead>
                                  <TableHead>Procedure</TableHead>
                                  <TableHead>Engineering Controls</TableHead>
                                  <TableHead>PPE</TableHead>
                                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {form.watch('hazardousProcedures')?.map((proc, index) => (
                                  <TableRow key={index} data-testid={`row-hazardous-procedure-${index}`}>
                                    <TableCell className="font-medium">{proc.cellLineName}</TableCell>
                                    <TableCell>{proc.procedure}</TableCell>
                                    <TableCell>{proc.engineeringControls.length} selected</TableCell>
                                    <TableCell>{proc.ppe.length} selected</TableCell>
                                    {!isReadOnly && (
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditHazardousProcedureDialog(index)}
                                            className="flex items-center gap-1"
                                            data-testid={`button-edit-hazardous-procedure-${index}`}
                                          >
                                            <Pencil className="w-4 h-4" />
                                            Edit
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteHazardousProcedure(index)}
                                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                                            data-testid={`button-delete-hazardous-procedure-${index}`}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Hazardous Procedure Dialog */}
                        <Dialog open={hazardousProcedureDialogOpen} onOpenChange={setHazardousProcedureDialogOpen}>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {editingHazardousProcedureIndex !== null ? 'Edit Hazardous Procedure' : 'Add Hazardous Procedure'}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6 py-4">
                              {/* Select Cell Line */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Select Cell Line <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={hazardousProcedureFormData.cellLineId}
                                  onValueChange={(value) => {
                                    const cellLines = form.getValues('cellLines') || [];
                                    const selectedCellLine = cellLines.find((_, index) => index.toString() === value);
                                    setHazardousProcedureFormData({
                                      ...hazardousProcedureFormData,
                                      cellLineId: value,
                                      cellLineName: selectedCellLine?.name || "",
                                    });
                                  }}
                                >
                                  <SelectTrigger data-testid="select-cell-line">
                                    <SelectValue placeholder="Select a cell line" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(form.getValues('cellLines') || []).map((cellLine, index) => (
                                      <SelectItem key={index} value={index.toString()}>
                                        {cellLine.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {(form.getValues('cellLines') || []).length === 0 && (
                                  <p className="text-sm text-amber-600">
                                    No cell lines available. Please add a cell line first in the Cell Lines tab.
                                  </p>
                                )}
                              </div>

                              {/* Procedure */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Procedure <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={hazardousProcedureFormData.procedure}
                                  onValueChange={(value) => setHazardousProcedureFormData({...hazardousProcedureFormData, procedure: value})}
                                >
                                  <SelectTrigger data-testid="select-procedure">
                                    <SelectValue placeholder="Select procedure" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Chemicals">Chemicals</SelectItem>
                                    <SelectItem value="Endothermal Reaction">Endothermal Reaction</SelectItem>
                                    <SelectItem value="FACS">FACS</SelectItem>
                                    <SelectItem value="Generation of Splashes">Generation of Splashes</SelectItem>
                                    <SelectItem value="Hazardous Procedure">Hazardous Procedure</SelectItem>
                                    <SelectItem value="Sprays or Aerosols from Centrifugation">Sprays or Aerosols from Centrifugation</SelectItem>
                                    <SelectItem value="Use of Sharps (needled or glass)">Use of Sharps (needled or glass)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Other Cells Description */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  If Other is selected, please indicate the Other cells for which this hazardous procedure applies
                                </label>
                                <Textarea
                                  value={hazardousProcedureFormData.otherCellsDescription}
                                  onChange={(e) => setHazardousProcedureFormData({...hazardousProcedureFormData, otherCellsDescription: e.target.value})}
                                  placeholder="Enter other cells description"
                                  className="min-h-[100px]"
                                  data-testid="textarea-other-cells"
                                />
                              </div>

                              {/* Engineering Controls */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Engineering Controls (check all applicable) <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    'Centrifuge Cone',
                                    'Class II Biosafety Cabinet',
                                    'Engineered Sharps',
                                    'Fume Hood',
                                    'HEPA Filtered Cage',
                                    'Local Exhaust Snorkel',
                                    'N/A',
                                    'Sealed Rotor',
                                    'Sealed Vials/Tubes',
                                    'Sharps Container'
                                  ].map((control) => (
                                    <div key={control} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`engineering-${control}`}
                                        checked={hazardousProcedureFormData.engineeringControls.includes(control)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setHazardousProcedureFormData({
                                              ...hazardousProcedureFormData,
                                              engineeringControls: [...hazardousProcedureFormData.engineeringControls, control]
                                            });
                                          } else {
                                            setHazardousProcedureFormData({
                                              ...hazardousProcedureFormData,
                                              engineeringControls: hazardousProcedureFormData.engineeringControls.filter(c => c !== control)
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid={`checkbox-engineering-${control.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                      />
                                      <label htmlFor={`engineering-${control}`} className="text-sm cursor-pointer">{control}</label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* PPE */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  PPE (check all applicable) <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    'Face shield',
                                    'Gloves',
                                    'Goggles',
                                    'Head Cover/Bonnet',
                                    'Lab Coat, Disposable',
                                    'Lab Coat-reusable, Laundered',
                                    'N/A',
                                    'N95',
                                    'PADR',
                                    'Safety Glasses',
                                    'Shoe Covers',
                                    'Surgical Mask',
                                    'Tyvek Suit'
                                  ].map((ppe) => (
                                    <div key={ppe} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`ppe-${ppe}`}
                                        checked={hazardousProcedureFormData.ppe.includes(ppe)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setHazardousProcedureFormData({
                                              ...hazardousProcedureFormData,
                                              ppe: [...hazardousProcedureFormData.ppe, ppe]
                                            });
                                          } else {
                                            setHazardousProcedureFormData({
                                              ...hazardousProcedureFormData,
                                              ppe: hazardousProcedureFormData.ppe.filter(p => p !== ppe)
                                            });
                                          }
                                        }}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid={`checkbox-ppe-${ppe.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                      />
                                      <label htmlFor={`ppe-${ppe}`} className="text-sm cursor-pointer">{ppe}</label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Procedure Details */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Describe detail use of the Hazardous Procedure on Selected Cell Lines <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                  value={hazardousProcedureFormData.procedureDetails}
                                  onChange={(e) => setHazardousProcedureFormData({...hazardousProcedureFormData, procedureDetails: e.target.value})}
                                  placeholder="Enter detailed procedure description"
                                  className="min-h-[120px]"
                                  data-testid="textarea-procedure-details"
                                />
                              </div>
                            </div>

                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setHazardousProcedureDialogOpen(false)}
                                data-testid="button-cancel-hazardous-procedure"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={saveHazardousProcedure}
                                data-testid="button-save-hazardous-procedure"
                              >
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TabsContent>

                    {/* Exposure Control Plan Subtab */}
                    <TabsContent value="exposure-control" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        {/* Exposure Control Plan Compliance */}
                        <FormField
                          control={form.control}
                          name="exposureControlPlanCompliance"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  I have read and agree to comply with the practices and procedures described in my Institution's Exposure Control Plan <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-exposure-control-yes"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-exposure-control-no"
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

                        {/* Hand Washing Device */}
                        <FormField
                          control={form.control}
                          name="handWashingDevice"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Is there a hand washing device available in the room(s)? <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-handwashing-yes"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-handwashing-no"
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

                        {/* Laundry Method */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                          <h4 className="font-medium">Select how you plan to launder soiled lab coats or other contaminated, non-disposable clothing... <span className="text-red-500">*</span></h4>
                          <FormField
                            control={form.control}
                            name="laundryMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-3">
                                    {[
                                      'Disposable as regulated medical waste and replacement',
                                      'In-house Facilities',
                                      'Offsite Vendor',
                                      'Other'
                                    ].map((method) => (
                                      <div key={method} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`laundry-${method}`}
                                          checked={field.value?.includes(method) || false}
                                          disabled={isReadOnly}
                                          onChange={(e) => {
                                            const currentValues = field.value || [];
                                            if (e.target.checked) {
                                              field.onChange([...currentValues, method]);
                                            } else {
                                              field.onChange(currentValues.filter((v: string) => v !== method));
                                            }
                                          }}
                                          className="w-4 h-4 text-blue-600"
                                          data-testid={`checkbox-laundry-${method.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                        />
                                        <label htmlFor={`laundry-${method}`} className="text-sm cursor-pointer">{method}</label>
                                      </div>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Conditional text field for Other */}
                          {Array.isArray(form.watch('laundryMethod')) && form.watch('laundryMethod')?.includes('Other') && (
                            <FormField
                              control={form.control}
                              name="laundryMethodOther"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Please specify other laundry method</FormLabel>
                                  <FormControl>
                                    <textarea
                                      {...field}
                                      value={field.value || ''}
                                      disabled={isReadOnly}
                                      className="w-full min-h-[80px] p-2 border rounded-md"
                                      placeholder="Please describe..."
                                      data-testid="textarea-laundry-other"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Additional Detail Subtab */}
                    <TabsContent value="additional-detail" className="space-y-6 mt-6">
                      <div className="space-y-6">
                        {/* Known Pathogens Question */}
                        <FormField
                          control={form.control}
                          name="materialsContainKnownPathogens"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="space-y-3">
                                <FormLabel className="text-base font-medium">
                                  Do these materials contain known pathogens (i.e. Hepatitis B, HIV, Herpes B Virus)? <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-6">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === true}
                                        onChange={() => field.onChange(true)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-pathogens-yes"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={field.value === false}
                                        onChange={() => field.onChange(false)}
                                        disabled={isReadOnly}
                                        className="w-4 h-4 text-blue-600"
                                        data-testid="radio-pathogens-no"
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

                        {/* Conditional: List material and pathogen */}
                        {form.watch('materialsContainKnownPathogens') && (
                          <FormField
                            control={form.control}
                            name="materialPathogenDetails"
                            render={({ field }) => (
                              <FormItem className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <FormLabel className="text-base font-medium">
                                  List the material and the known pathogen <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <textarea
                                    {...field}
                                    value={field.value || ''}
                                    disabled={isReadOnly}
                                    className="w-full min-h-[100px] p-2 border rounded-md"
                                    placeholder="List the material and known pathogen..."
                                    data-testid="textarea-pathogen-details"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Material Treatment Details */}
                        <FormField
                          control={form.control}
                          name="materialTreatmentDetails"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <FormLabel className="text-base font-medium">
                                Explain any type of treatment the material has undergone prior to receipt (i.e. formaldehyde fixation, testing for viruses)
                              </FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  value={field.value || ''}
                                  disabled={isReadOnly}
                                  className="w-full min-h-[100px] p-2 border rounded-md"
                                  placeholder="Describe any treatment..."
                                  data-testid="textarea-treatment-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Infection Symptoms */}
                        <FormField
                          control={form.control}
                          name="infectionSymptoms"
                          render={({ field }) => (
                            <FormItem className="bg-white p-4 rounded-lg border border-gray-200">
                              <FormLabel className="text-base font-medium">
                                What are the signs and symptoms of infection from exposure to these materials
                              </FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  value={field.value || ''}
                                  disabled={isReadOnly}
                                  className="w-full min-h-[100px] p-2 border rounded-md"
                                  placeholder="Describe signs and symptoms..."
                                  data-testid="textarea-infection-symptoms"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="facilities" className="space-y-6 mt-6">
              <IbcFacilitiesTab 
                applicationId={ibcApplication.id} 
                application={ibcApplication}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="inactivation" className="space-y-6 mt-6">
              <IbcInactivationDecontaminationTab 
                applicationId={ibcApplication.id} 
                application={ibcApplication}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="disposal" className="space-y-6 mt-6">
              <IbcDisposalTab 
                applicationId={ibcApplication.id} 
                application={ibcApplication}
                isReadOnly={isReadOnly}
              />
            </TabsContent>

            <TabsContent value="transport" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transport/Shipping</CardTitle>
                  <CardDescription>Transport and shipping procedures for biological materials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Local Transport */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Local Transport</h3>
                    
                    <FormField
                      control={form.control}
                      name="deviatingFromLocalTransport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Deviating from Local Transport Standard Practice?
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("deviatingFromLocalTransport") && (
                      <FormField
                        control={form.control}
                        name="deviatingFromLocalTransportDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please provide details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the deviation from local transport standard practice..."
                                className="resize-none"
                                rows={3}
                                {...field}
                                disabled={isReadOnly}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Transporting to Off Campus Locations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Transporting to Off Campus Locations</h3>
                    
                    <FormField
                      control={form.control}
                      name="transportingBioHazardousToOffCampus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Transporting Bio-hazardous Materials to Off Campus Locations?
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("transportingBioHazardousToOffCampus") && (
                      <FormField
                        control={form.control}
                        name="transportingBioHazardousToOffCampusDetails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please provide details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the bio-hazardous materials being transported to off campus locations..."
                                className="resize-none"
                                rows={3}
                                {...field}
                                disabled={isReadOnly}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Transporting from Off Campus Locations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Transporting from Off Campus Locations</h3>
                    
                    <FormField
                      control={form.control}
                      name="receivingBiologicalFromOffCampus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Receiving biological samples from off campus locations?
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dual-use" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dual Use</CardTitle>
                  <CardDescription>Dual use research and agents classification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Agents and Toxins */}
                  <div className="space-y-4">
                    <FormLabel className="text-base font-semibold">
                      Please check all applicable Agents and Toxins <span className="text-red-500">*</span>
                    </FormLabel>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        'Avian influenza virus (highly pathogenic) virus',
                        'Bacillus anthracis',
                        'Burkholderia mallei',
                        'Dysport, Xeomin, Myobloc, Lantox, Prosigne, Neuronox/Siax',
                        'Ebola virus',
                        'Foot-and-mouth disease virus',
                        'Francisella tularensis',
                        'Marburg virus',
                        'N/A',
                        'Reconstructed 1918 Influenza',
                        'Rinderpest virus',
                        'Toxin-producing strains of Clostridium',
                        'Variola major virus',
                        'Variola minor virus',
                        'Yersinia pestis',
                        'Botulinum neurotoxins (any quantity, even BOTOX; other brand names: Dysport, Xeomin, Myobloc, Lantox, Prosigne, Neuronox/Siax)'
                      ].map((agent) => (
                        <FormField
                          key={agent}
                          control={form.control}
                          name="dualUseAgentsAndToxins"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value?.includes(agent) || false}
                                  onChange={(e) => {
                                    const currentValue = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentValue, agent]);
                                    } else {
                                      field.onChange(currentValue.filter((item: string) => item !== agent));
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  className="rounded border-gray-300"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{agent}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dual Use Categories Question */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="dualUseCategoriesApply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Does your work fall under the Dual Use Categories? <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>Yes</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  disabled={isReadOnly}
                                  className="form-radio"
                                />
                                <span>No</span>
                              </label>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Conditional fields when "Yes" is selected */}
                    {form.watch("dualUseCategoriesApply") && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="dualUseCategoriesExplanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>If yes, please explain <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Explain how your work falls under dual use categories..."
                                  className="resize-none"
                                  rows={4}
                                  {...field}
                                  disabled={isReadOnly}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <FormLabel className="text-base font-semibold">
                            Check any categories of experiments below that apply to the research experiments or projects <span className="text-red-500">*</span>
                          </FormLabel>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              'Alters the host range or tropism of the agent or toxin',
                              'Confers to the agent or toxin resistance to clinically and/or agriculturally useful prophylactic or therapeutic interventions',
                              'Disrupts immunity or the effectiveness of an immunization against the agent/toxin w/o clinical and/or agricultural justification',
                              'Enhances the harmful consequences of the agent or toxin',
                              'Enhances the susceptibility of a host population to the agent or toxin',
                              'Generates or reconstitutes an eradicated or extinct agent or toxin listed above',
                              'Increases the stability, transmissibility, or the ability to disseminate the agent or toxin',
                              'None of the above'
                            ].map((category) => (
                              <FormField
                                key={category}
                                control={form.control}
                                name="dualUseExperimentCategories"
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={field.value?.includes(category) || false}
                                        onChange={(e) => {
                                          const currentValue = field.value || [];
                                          if (e.target.checked) {
                                            field.onChange([...currentValue, category]);
                                          } else {
                                            field.onChange(currentValue.filter((item: string) => item !== category));
                                          }
                                        }}
                                        disabled={isReadOnly}
                                        className="rounded border-gray-300"
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">{category}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* Confirmation Dialog for Nucleic Acids Tab Data Deletion */}
      <AlertDialog open={nucleicAcidsConfirmDialog} onOpenChange={setNucleicAcidsConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Data Will Be Deleted</AlertDialogTitle>
            <AlertDialogDescription>
              You have data filled in the Recombinant or Synthetic Nucleic Acids tab. 
              If you change this answer to "No", all data in that tab will be permanently deleted, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Synthetic Experiments</li>
                <li>NIH Guidelines sections</li>
              </ul>
              <p className="mt-3 font-semibold">This action cannot be undone. Are you sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              // Keep the toggle as "Yes" - no data deletion
              setNucleicAcidsConfirmDialog(false);
            }}>
              Cancel (Keep Data)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // User confirmed - proceed with data deletion
                form.setValue('recombinantSyntheticNucleicAcid', false);
                clearNucleicAcidsData();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Data and Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Human/NHP Tab Data Deletion */}
      <AlertDialog open={humanNhpConfirmDialog} onOpenChange={setHumanNhpConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Data Will Be Deleted</AlertDialogTitle>
            <AlertDialogDescription>
              You have data filled in the Human/NHP Material tab. 
              If you change this answer to "No", all data in that tab will be permanently deleted, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Human and Non-Human Primate Origin information</li>
                <li>Cell Lines</li>
                <li>Hazardous Procedures</li>
                <li>Stem Cells</li>
                <li>Exposure Control Plan details</li>
              </ul>
              <p className="mt-3 font-semibold">This action cannot be undone. Are you sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              // Keep the toggle as "Yes" - no data deletion
              setHumanNhpConfirmDialog(false);
            }}>
              Cancel (Keep Data)
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // User confirmed - proceed with data deletion
                form.setValue('humanNonHumanPrimateMaterial', false);
                clearHumanNhpData();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Data and Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}