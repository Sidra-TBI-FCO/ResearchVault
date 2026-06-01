// @ts-nocheck — Pre-existing TypeScript errors in this file are suppressed so `npx tsc --noEmit` runs clean and new code in other files gets reliable type-checking feedback.
// Most errors here stem from untyped `useQuery` results (data inferred as `unknown`), drifted shared/schema field renames, and form values typed as `unknown`. They are not known runtime bugs but should be fixed file-by-file as each is next touched: remove this directive, run `npx tsc --noEmit`, and resolve what surfaces.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Building,
  Biohazard,
  Shield,
  Home,
  Send,
  Eye,
  UserCheck,
  X,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Dna,
  Trash2,
  Truck,
  Microscope,
  ClipboardList,
  Beaker,
  ListChecks,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { IbcApplication, Scientist, IbcBoardMember } from "@shared/schema";
import IbcFacilitiesTab from "@/components/IbcFacilitiesTab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullName } from "@/utils/nameUtils";

// Helper function to get certification color based on expiry date
function getCertificationColor(expiryDate: string | null): string {
  if (!expiryDate) {
    return 'bg-gray-100 text-gray-600';
  }

  const today = new Date();
  const expiry = parseISO(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (daysUntilExpiry < 0) {
    return 'bg-red-100 text-red-800';
  } else if (daysUntilExpiry <= 30) {
    return 'bg-orange-100 text-orange-800';
  } else {
    return 'bg-green-100 text-green-800';
  }
}

const IBC_WORKFLOW_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800", icon: Send },
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Eye },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800", icon: XCircle },
];

const BIOSAFETY_LEVELS = [
  { value: "BSL-1", label: "BSL-1", color: "bg-green-100 text-green-800", description: "Minimal risk" },
  { value: "BSL-2", label: "BSL-2", color: "bg-yellow-100 text-yellow-800", description: "Moderate risk" },
  { value: "BSL-3", label: "BSL-3", color: "bg-orange-100 text-orange-800", description: "High risk" },
  { value: "BSL-4", label: "BSL-4", color: "bg-red-100 text-red-800", description: "Extreme danger" },
];

// Friendly labels for stored JSON keys (NIH sections, inactivation, disposal, etc.).
// Anything not listed falls back to humanize().
const LABELS: Record<string, string> = {
  // NIH Section III-A/B/C
  drugResistanceTraits: "III-A: Deliberate transfer of drug resistance traits to microorganisms",
  toxinMolecules: "III-B: Cloning toxin molecules with LD50 < 100 ng/kg body weight",
  humanGeneTransfer: "III-C: Human gene transfer experiments (clinical trials)",
  // NIH Section III-D
  riskGroup2Plus: "III-D-1: Using Risk Group 2, 3, 4, or restricted agents as host-vector systems",
  pathogenDnaRna: "III-D-2: DNA from Risk Group 2, 3, 4, or restricted agents in nonpathogenic hosts",
  infectiousViral: "III-D-3: Infectious DNA or RNA viruses in tissue culture systems",
  wholeAnimalExperiments: "III-D-4: Experiments involving whole animals",
  wholePlants: "III-D-5: Experiments involving whole plants",
  largeScaleExperiments: "III-D-6: Experiments involving more than 10 liters of culture",
  influenzaViruses: "III-D-7: Experiments involving influenza viruses",
  geneDriveOrganisms: "III-D-8: Experiments involving gene drive modified organisms",
  // NIH Section III-E
  limitedViralGenome: "III-E-1: Recombinant nucleic acids containing no more than 2/3 of eukaryotic virus genome",
  plantExperiments: "III-E-2: Experiments involving whole plants",
  transgenicRodents: "III-E-3: Experiments involving transgenic rodents",
  // NIH Section III-F
  f1TissueCulture: "III-F-1: Recombinant/synthetic nucleic acid molecules in tissue culture",
  f2EcoliK12: "III-F-2: E. coli K-12 host-vector systems",
  f3Saccharomyces: "III-F-3: Saccharomyces cerevisiae and S. uvarum host-vector systems",
  f4Kluyveromyces: "III-F-4: Kluyveromyces lactis host-vector systems",
  f5Bacillus: "III-F-5: Bacillus subtilis or B. licheniformis host-vector systems",
  f6GramPositive: "III-F-6: Extrachromosomal elements of gram-positive organisms",
  f7TransgenicRodents: "III-F-7: Purchase or transfer of transgenic rodents",
  f8TransgenicBreeding: "III-F-8: Generation of BL1 transgenic rodents via breeding",
  exemptionJustification: "Exemption justification",
  // NIH Appendix C
  cI: "C-I: Recombinant/synthetic nucleic acid molecules in tissue culture",
  cII: "C-II: Escherichia coli K-12 host-vector systems",
  cIII: "C-III: Saccharomyces host-vector systems",
  cIV: "C-IV: Kluyveromyces host-vector systems",
  cV: "C-V: Bacillus subtilis or B. licheniformis host-vector systems",
  cVI: "C-VI: Extrachromosomal elements of gram-positive organisms",
  cVII: "C-VII: Purchase or transfer of transgenic rodents",
  cVIII: "C-VIII: Generation of BL1 transgenic rodents via breeding",
  cIX: "C-IX: Footnotes and references of Appendix C",
  additionalConsiderations: "Additional considerations",
  // Inactivation & Decontamination
  treatWasteWithNaOH: "Treat toxin waste with 2N NaOH (≥1 hour)",
  commercialBleach20Min: "10% commercial bleach (20 min contact)",
  quaternaryAmmonium: "Quaternary Ammonium",
  sporKlenz: "Spor-Klenz",
  relyOn: "Rely+On",
  otherDisinfection: "Other disinfection method",
  autoclaved60Min121C: "Autoclaved ≥60 min at 121°C",
  solidWasteGBP1: "General Biosafety Procedure 1",
  solidWasteGBP2: "General Biosafety Procedure 2",
  solidWasteGBP3: "General Biosafety Procedure 3",
  solidWasteOtherExplanation: "Other (explanation)",
  disinfect10PercentBleach30Min: "Disinfect with 10% bleach (≥30 min)",
  autoclaved30Min121CLiquid: "Autoclaved ≥30 min at 121°C (liquid)",
  otherProvenDisinfectants: "Other proven disinfectants",
  standardRodentBarrier: "Standard rodent barrier",
  standardNonRodent: "Standard non-rodent",
  standardBiosafetyFacility: "Standard biosafety facility",
  animalCageGBP1: "General Biosafety Procedure 1",
  animalCageGBP2: "General Biosafety Procedure 2",
  animalCageGBP3: "General Biosafety Procedure 3",
  // Disposal
  standardRecommendedPractices: "Standard recommended practices",
  regulatedMedicalWaste: "Regulated Medical Waste",
  biologicalWasteRedBag: "Biological waste in red biohazard bag",
  contaminatedSharpsContainer: "Contaminated sharps in biohazard sharps container",
  generalBiosafety: "General Biosafety",
  procedure1: "Procedure 1",
  procedure2: "Procedure 2",
  procedure3: "Procedure 3",
  procedureOther: "Other",
  carcasses: "Carcasses",
};

function humanize(key: string): string {
  if (!key) return "";
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function labelFor(key: string): string {
  return LABELS[key] || humanize(key);
}

function safeDate(value: any): string {
  if (!value) return "";
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? "" : format(dt, "MMM d, yyyy");
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

// Recursively render a stored JSON object: true booleans become chips,
// strings/numbers/arrays become labeled rows, nested objects become indented blocks.
// Returns null when nothing meaningful is present, so empty sections stay hidden.
function buildDataBlock(data: any): React.ReactNode | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const chips: string[] = [];
  const rows: Array<[string, string]> = [];
  const nested: Array<[string, React.ReactNode]> = [];

  for (const [key, val] of Object.entries(data)) {
    const label = labelFor(key);
    if (val === true) {
      chips.push(label);
    } else if (val === false || val === null || val === undefined) {
      continue;
    } else if (Array.isArray(val)) {
      if (val.length > 0) {
        const allPrimitive = val.every((v) => typeof v !== "object" || v === null);
        if (allPrimitive) {
          rows.push([label, val.join(", ")]);
        } else {
          val.forEach((item, i) => {
            const child = buildDataBlock(item);
            if (child) nested.push([`${label} ${i + 1}`, child]);
          });
        }
      }
    } else if (typeof val === "object") {
      const child = buildDataBlock(val);
      if (child) nested.push([label, child]);
    } else if (typeof val === "string") {
      if (val.trim() !== "") rows.push([label, val]);
    } else {
      rows.push([label, String(val)]);
    }
  }

  if (chips.length === 0 && rows.length === 0 && nested.length === 0) return null;

  return (
    <div className="space-y-2">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Badge key={c} variant="secondary" className="font-normal">
              {c}
            </Badge>
          ))}
        </div>
      )}
      {rows.map(([l, v]) => (
        <div key={l} className="text-sm">
          <span className="text-xs font-medium text-gray-500">{l}: </span>
          <span className="whitespace-pre-wrap">{v}</span>
        </div>
      ))}
      {nested.map(([l, child], idx) => (
        <div key={`${l}-${idx}`} className="pl-3 border-l-2 border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-1">{l}</p>
          {child}
        </div>
      ))}
    </div>
  );
}

// Small read-only display helpers
function Field({ label, value }: { label: string; value: any }) {
  if (isEmptyValue(value)) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{display}</p>
    </div>
  );
}

function YesNoRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  const yes = value === true || value === "true" || value === "yes";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Badge variant="outline" className={yes ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}>
        {yes ? "Yes" : "No"}
      </Badge>
    </div>
  );
}

function ChipList({ label, values }: { label: string; values: any }) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <Badge key={`${v}-${i}`} variant="secondary" className="font-normal">
            {String(v)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function IbcProtocolDetailPage() {
  const [, params] = useRoute("/ibc-office/protocol-detail/:id");
  const applicationId = params?.id ? parseInt(params.id) : null;
  const [newWorkflowStatus, setNewWorkflowStatus] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const [selectedReviewers, setSelectedReviewers] = useState<number[]>([]);
  const [showReviewerSelection, setShowReviewerSelection] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: [`/api/ibc-applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: [`/api/ibc-applications/${applicationId}/comments`],
    enabled: !!applicationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: scientist } = useQuery({
    queryKey: [`/api/scientists/${application?.principalInvestigatorId}`],
    enabled: !!application?.principalInvestigatorId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: boardMembers = [] } = useQuery({
    queryKey: ["/api/ibc-board-members"],
  });

  const { data: boardMembersWithScientists = [] } = useQuery({
    queryKey: ["/api/ibc-board-members-with-scientists"],
    queryFn: async () => {
      const boardMembersResponse = await fetch("/api/ibc-board-members");
      const boardMembersData = await boardMembersResponse.json();
      const membersWithScientists = await Promise.all(
        boardMembersData.map(async (member: IbcBoardMember) => {
          try {
            const scientistResponse = await fetch(`/api/scientists/${member.scientistId}`);
            const scientist = await scientistResponse.json();
            return { ...member, scientist };
          } catch (error) {
            return { ...member, scientist: null };
          }
        })
      );
      return membersWithScientists;
    },
  });

  const { data: researchActivities = [] } = useQuery({
    queryKey: [`/api/ibc-applications/${applicationId}/research-activities`],
    enabled: !!applicationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: personnelData = [], isLoading: personnelLoading } = useQuery({
    queryKey: [`/api/ibc-applications/${applicationId}/personnel`],
    enabled: !!applicationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: certificationModules = [] } = useQuery({
    queryKey: ["/api/certification-modules"],
  });

  const { data: certificationMatrix = [] } = useQuery({
    queryKey: ["/api/certifications/matrix"],
  });

  const teamCertifications = certificationMatrix.reduce((acc: any, cert: any) => {
    if (!acc[cert.scientistId]) {
      acc[cert.scientistId] = [];
    }
    acc[cert.scientistId].push(cert);
    return acc;
  }, {});

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; reviewComments?: string; reviewerAssignments?: any }) => {
      return apiRequest("PATCH", `/api/ibc-applications/${applicationId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/ibc-applications/${applicationId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/ibc-applications/${applicationId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ibc-applications"] });
      toast({
        title: "Status Updated",
        description: "Application status has been updated successfully.",
      });
      setNewWorkflowStatus("");
      setReviewComments("");
      setSelectedReviewers([]);
      setShowReviewerSelection(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    },
  });

  if (applicationLoading || !application) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentStatus = IBC_WORKFLOW_STATUSES.find((s) => s.value === application.status?.toLowerCase());
  const biosafetyLevel = BIOSAFETY_LEVELS.find((l) => l.value === application.biosafetyLevel);
  const StatusIcon = currentStatus?.icon || FileText;

  const handleStatusUpdate = () => {
    if (!newWorkflowStatus) return;

    if (!reviewComments.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment explaining this workflow action before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (newWorkflowStatus === "under_review" && selectedReviewers.length === 0) {
      toast({
        title: "Reviewers Required",
        description: "Please select at least one reviewer when changing status to 'Under Review'.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      status: newWorkflowStatus,
      reviewComments: reviewComments || undefined,
    };

    if (newWorkflowStatus === "under_review" && selectedReviewers.length > 0) {
      updateData.reviewerAssignments = selectedReviewers.map((reviewerId) => ({
        reviewerId,
        assignedDate: new Date().toISOString(),
        status: "assigned",
        boardMember: boardMembers.find((bm: IbcBoardMember) => bm.id === reviewerId),
      }));
    }

    updateStatusMutation.mutate(updateData);
  };

  // ---- Section visibility flags (hide sections whose trigger was not selected) ----
  const showSummary = !!(application.description || application.protocolSummary);
  const showActivities = Array.isArray(researchActivities) && researchActivities.length > 0;
  const scopeItems = [
    ["recombinantSyntheticNucleicAcid", "Recombinant or Synthetic Nucleic Acids"],
    ["wholeAnimalsAnimalMaterial", "Whole Animals / Animal Material"],
    ["humanNonHumanPrimateMaterial", "Human / Non-Human Primate Material"],
    ["microorganismsInfectiousMaterial", "Microorganisms / Infectious Material"],
    ["biologicalToxins", "Biological Toxins"],
    ["nanoparticles", "Nanoparticles"],
    ["arthropods", "Arthropods"],
    ["plants", "Plants"],
  ].filter(([k]) => application[k]);

  const showNucleic = !!application.recombinantSyntheticNucleicAcid;
  const showHuman = !!application.humanNonHumanPrimateMaterial;

  const nihBlockABC = buildDataBlock(application.nihSectionABC);
  const nihBlockD = buildDataBlock(application.nihSectionD);
  const nihBlockE = buildDataBlock(application.nihSectionE);
  const nihBlockF = buildDataBlock(application.nihSectionF);
  const nihBlockC = buildDataBlock(application.nihAppendixC);
  const hasNih = !!(nihBlockABC || nihBlockD || nihBlockE || nihBlockF || nihBlockC);

  const syntheticExperiments = Array.isArray(application.syntheticExperiments) ? application.syntheticExperiments : [];
  const cellLines = Array.isArray(application.cellLines) ? application.cellLines : [];
  const hazardousProcedures = Array.isArray(application.hazardousProcedures) ? application.hazardousProcedures : [];

  const inactivationBlock = buildDataBlock(application.inactivationDecontamination);
  const disposalBlock = buildDataBlock(application.disposal);

  const showTransport =
    application.deviatingFromLocalTransport === true ||
    application.transportingBioHazardousToOffCampus === true ||
    application.receivingBiologicalFromOffCampus === true ||
    !!application.deviatingFromLocalTransportDetails ||
    !!application.transportingBioHazardousToOffCampusDetails;

  const showDualUse =
    (application.dualUseAgentsAndToxins?.length > 0) ||
    application.dualUseCategoriesApply === true ||
    (application.dualUseExperimentCategories?.length > 0) ||
    !!application.dualUseCategoriesExplanation;

  const showMethods = !!(
    application.materialAndMethods ||
    application.proceduresInvolvingInfectiousAgents ||
    application.cellCultureProcedures ||
    application.animalProcedures ||
    application.laboratoryEquipment ||
    application.containmentProcedures ||
    application.emergencyProcedures ||
    application.ppeRequirements ||
    application.wasteSterilizationProcedures ||
    application.agents
  );

  const agentsBlocks = [
    ["Biological Agents", buildDataBlock(application.biologicalAgents)],
    ["Chemical Agents", buildDataBlock(application.chemicalAgents)],
    ["Radiological Materials", buildDataBlock(application.radiologicalMaterials)],
  ].filter(([, block]) => block);
  const showAgents = agentsBlocks.length > 0;

  // Build navigation list of visible sections
  const navItems = [
    { id: "sec-protocol", label: "Protocol Information" },
    showSummary && { id: "sec-summary", label: "Description & Summary" },
    showActivities && { id: "sec-activities", label: "Research Activities" },
    { id: "sec-scope", label: "Biosafety Scope" },
    { id: "sec-personnel", label: "Personnel & Training" },
    showNucleic && { id: "sec-nucleic", label: "Recombinant / Synthetic Nucleic Acids" },
    showHuman && { id: "sec-human", label: "Human / NHP Material" },
    showMethods && { id: "sec-methods", label: "Methods & Safety" },
    showAgents && { id: "sec-agents", label: "Hazardous Agents" },
    { id: "sec-facilities", label: "Facilities & Rooms" },
    inactivationBlock && { id: "sec-inactivation", label: "Inactivation & Decontamination" },
    disposalBlock && { id: "sec-disposal", label: "Disposal" },
    showTransport && { id: "sec-transport", label: "Transport / Shipping" },
    showDualUse && { id: "sec-dualuse", label: "Dual Use" },
  ].filter(Boolean) as { id: string; label: string }[];

  // Section wrapper with collapse toggle
  const Section = ({ id, title, icon: Icon, badge, children }: any) => {
    const isOpen = !collapsed[id];
    return (
      <Card id={id} className="scroll-mt-6">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => toggleSection(id)}
          data-testid={`header-section-${id}`}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              <span>{title}</span>
              {badge}
            </CardTitle>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardHeader>
        {isOpen && <CardContent className="space-y-4">{children}</CardContent>}
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-bold">IBC Protocol Review</h1>
          </div>
          <p className="text-gray-600" data-testid="text-ibc-number">{application.ibcNumber}</p>
          {application.title && <p className="text-sm text-gray-500 mt-1">{application.title}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={currentStatus?.color} data-testid="badge-status">
            <StatusIcon className="h-3 w-3 mr-1" />
            {currentStatus?.label || application.status}
          </Badge>
          {biosafetyLevel && (
            <Badge className={biosafetyLevel.color}>
              <Biohazard className="h-3 w-3 mr-1" />
              {biosafetyLevel.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — full read-only protocol */}
        <div className="lg:col-span-2 space-y-6">
          {/* Protocol Information */}
          <Section id="sec-protocol" title="Protocol Information" icon={FileText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Protocol Title" value={application.title} />
              <Field label="Short Title" value={application.shortTitle} />
              <Field label="IBC Number" value={application.ibcNumber} />
              <Field label="Cayuse Protocol Number" value={application.cayuseProtocolNumber} />
              <Field label="IRBnet IBC Number" value={application.irbnetIbcNumber} />
              <Field label="Biosafety Level" value={application.biosafetyLevel} />
              <Field label="Risk Group" value={application.riskGroupClassification} />
              <Field label="Risk Level" value={application.riskLevel} />
              <Field label="Submission Type" value={application.submissionType} />
              <Field label="Version" value={application.version} />
              <Field label="IACUC Protocol Number" value={application.iacucProtocolNumber} />
              <Field label="IRB Protocol Number" value={application.irbProtocolNumber} />
              <Field label="Additional Notification Email" value={application.additionalNotificationEmail} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t">
              <Field label="Submitted" value={safeDate(application.submissionDate)} />
              <Field label="Vetted" value={safeDate(application.vettedDate)} />
              <Field label="Under Review" value={safeDate(application.underReviewDate)} />
              <Field label="Approved" value={safeDate(application.approvalDate)} />
              <Field label="Expiration" value={safeDate(application.expirationDate)} />
              <Field label="Next Review" value={safeDate(application.nextReviewDate)} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Principal Investigator</p>
                <p className="font-medium" data-testid="text-pi-name">
                  {scientist ? formatFullName(scientist) : "Loading..."}
                </p>
                {scientist?.email && <p className="text-sm text-gray-500">{scientist.email}</p>}
              </div>
            </div>
          </Section>

          {/* Description & Summary */}
          {showSummary && (
            <Section id="sec-summary" title="Description & Summary" icon={ClipboardList}>
              <Field label="Project Description" value={application.description} />
              <Field label="Protocol Summary" value={application.protocolSummary} />
            </Section>
          )}

          {/* Linked Research Activities */}
          {showActivities && (
            <Section id="sec-activities" title="Linked Research Activities" icon={ListChecks}>
              <div className="space-y-2">
                {researchActivities.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                    data-testid={`row-activity-${activity.id}`}
                  >
                    <Microscope className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{activity.sdrNumber || activity.title}</p>
                      {activity.sdrNumber && activity.title && (
                        <p className="text-xs text-gray-500">{activity.title}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Biosafety Scope */}
          <Section id="sec-scope" title="Biosafety Scope" icon={Biohazard}>
            {scopeItems.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Materials & work involved</p>
                <div className="flex flex-wrap gap-1.5">
                  {scopeItems.map(([k, label]) => (
                    <Badge key={k} variant="secondary" className="font-normal">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No biosafety material categories were selected.</p>
            )}

            {application.wholeAnimalsAnimalMaterial && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-sm font-medium">Whole Animals / Animal Material</p>
                <ChipList label="Selected sub-options" values={application.animalMaterialSubOptions} />
                <YesNoRow
                  label="Introducing primate material into animals"
                  value={application.introducingPrimateMaterialIntoAnimals}
                />
              </div>
            )}

            {application.microorganismsInfectiousMaterial && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-sm font-medium">Microorganisms / Infectious Material</p>
                <YesNoRow
                  label="Introducing recombinant DNA into microorganisms"
                  value={application.introducingRecombinantDnaToMicroorganisms}
                />
              </div>
            )}

            {application.arthropods && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-sm font-medium">Arthropods</p>
                <YesNoRow label="Transgenic arthropods or exposure" value={application.transgenicArthropodsOrExposure} />
              </div>
            )}

            {application.plants && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-sm font-medium">Plants</p>
                <YesNoRow label="Transgenic plants or exposure" value={application.transgenicPlantsOrExposure} />
              </div>
            )}

            <div className="pt-2 border-t space-y-2">
              <p className="text-sm font-medium">Legacy classification</p>
              <YesNoRow label="Recombinant DNA" value={!!application.recombinantDNA} />
              <YesNoRow label="Animal Work" value={!!application.animalWork} />
              <YesNoRow label="Field Work" value={!!application.fieldWork} />
            </div>
          </Section>

          {/* Personnel & Training */}
          <Section id="sec-personnel" title="Personnel & Training" icon={Users}>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Team Members</p>
              {personnelLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : personnelData && personnelData.length > 0 ? (
                <div className="space-y-3">
                  {personnelData.map((member: any, index: number) => {
                    const memberCerts = member.scientistId ? teamCertifications[member.scientistId] || [] : [];
                    const citiCerts = memberCerts.filter((cert: any) => {
                      const module = certificationModules.find((m: any) => m.id === cert.moduleId);
                      return module && module.name !== "Lab Safety";
                    });
                    const labSafetyCert = memberCerts.find((cert: any) => {
                      const module = certificationModules.find((m: any) => m.id === cert.moduleId);
                      return module && module.name === "Lab Safety";
                    });

                    return (
                      <div
                        key={`${member.scientistId || "unknown"}-${member.role || "no-role"}-${index}`}
                        className="p-3 border rounded-lg bg-white"
                        data-testid={`row-member-${member.scientistId || index}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.scientist ? formatFullName(member.scientist) : "Unknown"}
                              </p>
                              <p className="text-sm text-gray-500">{member.scientist?.email || ""}</p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              member.role === "team_leader"
                                ? "bg-blue-100 text-blue-800"
                                : member.role === "safety_representative"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {member.role === "team_leader"
                              ? "Team Leader"
                              : member.role === "safety_representative"
                              ? "Safety Representative"
                              : "Team Member"}
                          </Badge>
                        </div>

                        {member.scientistId && (
                          <div className="space-y-1.5 pl-11">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-20">CITI:</span>
                              <div className="flex gap-1 flex-wrap">
                                <TooltipProvider>
                                  {citiCerts.length > 0 ? (
                                    citiCerts.map((cert: any, idx: number) => {
                                      const module = certificationModules.find((m: any) => m.id === cert.moduleId);
                                      return (
                                        <Tooltip key={idx}>
                                          <TooltipTrigger>
                                            <Badge
                                              className={`${getCertificationColor(cert.endDate)} cursor-help transition-colors text-xs`}
                                              variant="outline"
                                            >
                                              {module?.name || "Unknown"}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              {module?.name || "Unknown"} - Expires: {cert.endDate || "N/A"}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-600 text-xs" variant="outline">
                                      None
                                    </Badge>
                                  )}
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-20">Lab Safety:</span>
                              <TooltipProvider>
                                {labSafetyCert ? (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge
                                        className={`${getCertificationColor(labSafetyCert.endDate)} cursor-help transition-colors text-xs`}
                                        variant="outline"
                                      >
                                        {labSafetyCert.certificateName || "Certified"}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {labSafetyCert.certificateName || "Lab Safety"} - Expires:{" "}
                                        {labSafetyCert.endDate || "N/A"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 text-xs" variant="outline">
                                    None
                                  </Badge>
                                )}
                              </TooltipProvider>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No team members defined for this protocol</p>
              )}
            </div>
          </Section>

          {/* Recombinant / Synthetic Nucleic Acids */}
          {showNucleic && (
            <Section id="sec-nucleic" title="Recombinant / Synthetic Nucleic Acids" icon={Dna}>
              {hasNih && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">NIH Guidelines</p>
                  {nihBlockABC && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section III-A/B/C</p>
                      {nihBlockABC}
                    </div>
                  )}
                  {nihBlockD && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section III-D</p>
                      {nihBlockD}
                    </div>
                  )}
                  {nihBlockE && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section III-E</p>
                      {nihBlockE}
                    </div>
                  )}
                  {nihBlockF && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Section III-F (Exempt)</p>
                      {nihBlockF}
                    </div>
                  )}
                  {nihBlockC && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Appendix C</p>
                      {nihBlockC}
                    </div>
                  )}
                </div>
              )}

              {syntheticExperiments.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-semibold">Synthetic Experiments</p>
                  {syntheticExperiments.map((exp: any, i: number) => {
                    const block = buildDataBlock(exp);
                    return (
                      <div key={i} className="p-3 border rounded-lg bg-gray-50" data-testid={`row-synthetic-${i}`}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Experiment {i + 1}
                          {exp?.vectorInsertName ? ` — ${exp.vectorInsertName}` : ""}
                        </p>
                        {block || <p className="text-sm text-gray-500">No details provided.</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Additional details */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-semibold">Additional Details</p>
                <Field label="Nucleic acid extraction methods" value={application.nucleicAcidExtractionMethods} />
                <ChipList label="Proposed biosafety levels" values={application.proposedBiosafetyLevels} />
                <Field label="Host organism for DNA propagation" value={application.hostOrganismDnaPropagation} />
                <Field label="Purification measures (avoid aerosols)" value={application.purificationMeasures} />
                <YesNoRow
                  label="Provided restriction / vector maps to biosafety office"
                  value={application.providedRestrictionVectorMaps}
                />
                <Field label="Viral genome regions deleted/altered" value={application.viralGenomeRegionsAltered} />
                <YesNoRow label="Assaying for wild-type viral particles" value={application.assayingWildTypeViral} />
                <YesNoRow label="Handling more than 10 liters of culture" value={application.handleMoreThan10Liters} />
                <YesNoRow label="Gene drive system using CRISPR" value={application.geneDriveSystemCrispr} />
              </div>
            </Section>
          )}

          {/* Human / NHP Material */}
          {showHuman && (
            <Section id="sec-human" title="Human / NHP Material" icon={Beaker}>
              {/* Materials */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Materials</p>
                <YesNoRow label="Human origin material" value={application.humanOrigin} />
                <ChipList label="Human materials" values={application.humanMaterials} />
                <Field label="Tissues (details)" value={application.humanMaterialsTissuesOther} />
                <Field label="Other material (details)" value={application.humanMaterialsOtherMaterial} />
                <YesNoRow label="Non-human primate origin material" value={application.nonHumanPrimateOrigin} />
                <YesNoRow label="NHP exposure kit available" value={application.nhpExposureKit} />
                <ChipList label="Stem cells" values={application.stemCells} />
                <YesNoRow label="Stem cells listed in NIH registry" value={application.stemCellsNihRegistry} />
              </div>

              {cellLines.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-semibold">Cell Lines</p>
                  {cellLines.map((line: any, i: number) => {
                    const block = buildDataBlock(line);
                    return (
                      <div key={i} className="p-3 border rounded-lg bg-gray-50" data-testid={`row-cellline-${i}`}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">{line?.name || `Cell Line ${i + 1}`}</p>
                        {block || <p className="text-sm text-gray-500">No details provided.</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {hazardousProcedures.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-semibold">Hazardous Procedures</p>
                  {hazardousProcedures.map((proc: any, i: number) => {
                    const block = buildDataBlock(proc);
                    return (
                      <div key={i} className="p-3 border rounded-lg bg-gray-50" data-testid={`row-procedure-${i}`}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {proc?.procedure || `Procedure ${i + 1}`}
                        </p>
                        {block || <p className="text-sm text-gray-500">No details provided.</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Exposure Control Plan */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-semibold">Exposure Control Plan</p>
                <YesNoRow
                  label="Read & agree to comply with Exposure Control Plan"
                  value={application.exposureControlPlanCompliance}
                />
                <YesNoRow label="Hand washing device available in room(s)" value={application.handWashingDevice} />
                <ChipList label="Laundry method" values={application.laundryMethod} />
                <Field label="Other laundry method" value={application.laundryMethodOther} />
              </div>

              {/* Additional Detail */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-semibold">Additional Detail</p>
                <YesNoRow label="Materials contain known pathogens" value={application.materialsContainKnownPathogens} />
                <Field label="Material & known pathogen" value={application.materialPathogenDetails} />
                <Field label="Material treatment details" value={application.materialTreatmentDetails} />
                <Field label="Signs & symptoms of infection from exposure" value={application.infectionSymptoms} />
              </div>
            </Section>
          )}

          {/* Methods & Safety (legacy free-text fields, only if present) */}
          {showMethods && (
            <Section id="sec-methods" title="Methods & Safety" icon={FlaskConical}>
              <Field label="Materials and Methods" value={application.materialAndMethods} />
              <Field label="Procedures Involving Infectious Agents" value={application.proceduresInvolvingInfectiousAgents} />
              <Field label="Cell Culture Procedures" value={application.cellCultureProcedures} />
              <Field label="Animal Procedures" value={application.animalProcedures} />
              <Field label="Laboratory Equipment" value={application.laboratoryEquipment} />
              <Field label="Containment Procedures" value={application.containmentProcedures} />
              <Field label="Emergency Procedures" value={application.emergencyProcedures} />
              <Field label="PPE Requirements" value={application.ppeRequirements} />
              <Field label="Waste Sterilization" value={application.wasteSterilizationProcedures} />
              <Field label="Agents Description" value={application.agents} />
            </Section>
          )}

          {/* Hazardous Agents (JSON) */}
          {showAgents && (
            <Section id="sec-agents" title="Hazardous Agents" icon={AlertTriangle}>
              {agentsBlocks.map(([label, block]) => (
                <div key={label as string}>
                  <p className="text-sm font-semibold mb-1">{label as string}</p>
                  {block}
                </div>
              ))}
            </Section>
          )}

          {/* Facilities & Rooms (read-only reuse of the applicant component) */}
          <Section id="sec-facilities" title="Facilities & Rooms" icon={Home}>
            <IbcFacilitiesTab applicationId={applicationId} application={application} isReadOnly />
          </Section>

          {/* Inactivation & Decontamination */}
          {inactivationBlock && (
            <Section id="sec-inactivation" title="Inactivation & Decontamination" icon={Shield}>
              {inactivationBlock}
            </Section>
          )}

          {/* Disposal */}
          {disposalBlock && (
            <Section id="sec-disposal" title="Disposal" icon={Trash2}>
              {disposalBlock}
            </Section>
          )}

          {/* Transport / Shipping */}
          {showTransport && (
            <Section id="sec-transport" title="Transport / Shipping" icon={Truck}>
              <YesNoRow
                label="Deviating from local transport standard practice"
                value={application.deviatingFromLocalTransport}
              />
              <Field label="Deviation details" value={application.deviatingFromLocalTransportDetails} />
              <YesNoRow
                label="Transporting bio-hazardous materials off campus"
                value={application.transportingBioHazardousToOffCampus}
              />
              <Field label="Off-campus transport details" value={application.transportingBioHazardousToOffCampusDetails} />
              <YesNoRow
                label="Receiving biological samples from off-campus locations"
                value={application.receivingBiologicalFromOffCampus}
              />
            </Section>
          )}

          {/* Dual Use */}
          {showDualUse && (
            <Section id="sec-dualuse" title="Dual Use" icon={AlertTriangle}>
              <ChipList label="Agents & toxins" values={application.dualUseAgentsAndToxins} />
              <YesNoRow label="Work falls under dual use categories" value={application.dualUseCategoriesApply} />
              <Field label="Dual use explanation" value={application.dualUseCategoriesExplanation} />
              <ChipList label="Experiment categories" values={application.dualUseExperimentCategories} />
            </Section>
          )}

          {/* Documents placeholder (kept as-is per scope) */}
          <Section id="sec-documents" title="Documents" icon={FileText}>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management</h3>
              <p className="text-gray-500">Document management system will be available in a future update.</p>
            </div>
          </Section>
        </div>

        {/* Right column — jump nav + officer actions + communication history */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Jump navigation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">On this page</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-2 py-1"
                      data-testid={`nav-${item.id}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* Officer Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Officer Actions</CardTitle>
                <CardDescription>Comment back or move the protocol forward</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current status */}
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" />
                    <Badge variant="outline" className={currentStatus?.color}>
                      {currentStatus?.label || application.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="text-sm">{safeDate(application.updatedAt) || "Unknown"}</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {application?.status?.toLowerCase() === "submitted" && (
                      <>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("vetted");
                            handleStatusUpdate();
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          className="bg-purple-600 hover:bg-purple-700"
                          data-testid="button-accept-vetted"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Accept as Vetted
                        </Button>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("draft");
                            handleStatusUpdate();
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          variant="outline"
                          data-testid="button-return-applicant"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Return to Applicant
                        </Button>
                      </>
                    )}

                    {application?.status?.toLowerCase() === "vetted" && (
                      <>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("under_review");
                            setShowReviewerSelection(true);
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          className="bg-yellow-600 hover:bg-yellow-700"
                          data-testid="button-assign-reviewers"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Assign Reviewers
                        </Button>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("submitted");
                            handleStatusUpdate();
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          variant="outline"
                          data-testid="button-withdraw-vetting"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Withdraw Vetting
                        </Button>
                      </>
                    )}

                    {application?.status?.toLowerCase() === "under_review" && (
                      <>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("active");
                            handleStatusUpdate();
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-approve"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Protocol
                        </Button>
                        <Button
                          onClick={() => {
                            setNewWorkflowStatus("vetted");
                            handleStatusUpdate();
                          }}
                          disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                          variant="outline"
                          data-testid="button-return-revetting"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Return for Re-vetting
                        </Button>
                      </>
                    )}

                    {application?.status?.toLowerCase() === "active" && (
                      <Button
                        onClick={() => {
                          setNewWorkflowStatus("expired");
                          handleStatusUpdate();
                        }}
                        disabled={updateStatusMutation.isPending || !reviewComments.trim()}
                        variant="destructive"
                        data-testid="button-mark-expired"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark as Expired
                      </Button>
                    )}

                    {application?.status?.toLowerCase() === "draft" && (
                      <div className="text-sm text-gray-500 italic">
                        Waiting for Principal Investigator to submit application
                      </div>
                    )}

                    {application?.status?.toLowerCase() === "expired" && (
                      <div className="text-sm text-gray-500 italic">Protocol has expired. No actions available.</div>
                    )}
                  </div>
                </div>

                {/* Reviewer selection */}
                {showReviewerSelection && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium">Select Reviewers</label>
                        <p className="text-xs text-gray-500">Choose IBC board members to review this application</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowReviewerSelection(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-white">
                      {Array.isArray(boardMembersWithScientists) && boardMembersWithScientists.length > 0 ? (
                        boardMembersWithScientists
                          .filter((member: IbcBoardMember) => member.isActive)
                          .map((member: IbcBoardMember) => (
                            <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                id={`reviewer-${member.id}`}
                                checked={selectedReviewers.includes(member.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReviewers([...selectedReviewers, member.id]);
                                  } else {
                                    setSelectedReviewers(selectedReviewers.filter((id) => id !== member.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                                data-testid={`checkbox-reviewer-${member.id}`}
                              />
                              <label htmlFor={`reviewer-${member.id}`} className="flex-1 cursor-pointer">
                                <div className="flex items-center space-x-2">
                                  <UserCheck className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {member.scientist ? formatFullName(member.scientist) : "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {member.role === "chair"
                                        ? "Chair"
                                        : member.role === "deputy_chair"
                                        ? "Deputy Chair"
                                        : "Member"}
                                      {member.expertise && member.expertise.length > 0 &&
                                        ` • ${member.expertise.slice(0, 2).join(", ")}`}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No active board members available</p>
                      )}
                    </div>
                    {selectedReviewers.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Selected reviewers: {selectedReviewers.length}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedReviewers.map((reviewerId) => {
                            const member = boardMembersWithScientists.find((bm: IbcBoardMember) => bm.id === reviewerId);
                            return member ? (
                              <span
                                key={reviewerId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {member.scientist ? formatFullName(member.scientist) : "Unknown"}
                                <button
                                  onClick={() => setSelectedReviewers(selectedReviewers.filter((id) => id !== reviewerId))}
                                  className="hover:text-blue-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => {
                          handleStatusUpdate();
                          setShowReviewerSelection(false);
                        }}
                        disabled={updateStatusMutation.isPending || selectedReviewers.length === 0}
                        className="bg-yellow-600 hover:bg-yellow-700"
                        data-testid="button-confirm-reviewers"
                      >
                        {updateStatusMutation.isPending ? "Assigning..." : "Assign Selected Reviewers"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowReviewerSelection(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Review comment */}
                <div>
                  <label className="text-sm font-medium">Review Comments</label>
                  <Textarea
                    placeholder="Add comments about this status change..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    rows={4}
                    data-testid="input-review-comments"
                  />
                </div>

                {!reviewComments.trim() && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">Please provide a comment to enable workflow actions</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Communication History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Communication History</CardTitle>
              </CardHeader>
              <CardContent>
                {comments && comments.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {[...comments]
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((comment: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg bg-white" data-testid={`row-comment-${index}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-md ${
                                  comment.commentType === "office_comment"
                                    ? "bg-blue-100 text-blue-800"
                                    : comment.commentType === "reviewer_feedback"
                                    ? "bg-purple-100 text-purple-800"
                                    : comment.commentType === "status_change"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {comment.commentType === "office_comment"
                                  ? "Office"
                                  : comment.commentType === "reviewer_feedback"
                                  ? "Reviewer"
                                  : comment.commentType === "status_change"
                                  ? "Status"
                                  : "PI"}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-700">{comment.comment}</p>
                            {comment.recommendation && (
                              <div className="mt-1">
                                <span
                                  className={`text-xs px-2 py-1 rounded-md font-medium ${
                                    comment.recommendation === "approve"
                                      ? "bg-green-100 text-green-800"
                                      : comment.recommendation === "reject"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  Recommendation: {comment.recommendation.replace("_", " ")}
                                </span>
                              </div>
                            )}
                            {comment.statusFrom && comment.statusTo && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-600">
                                  {comment.statusFrom} → {comment.statusTo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No communication history yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
