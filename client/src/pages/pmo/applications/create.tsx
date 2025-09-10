import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Send, FileText, Users, Clock, FlaskConical, Info, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Ra200Form {
  // Header Information
  title: string;
  leadScientistId: number | null;
  projectId: number | null;
  budgetHolderId: number | null;
  budgetSource: string;
  
  // Research Activity Details
  abstract: string;
  backgroundRationale: string;
  objectivesPreliminary: string;
  approachMethods: string;
  discussionConclusion: string;
  
  // Requirements
  ethicsRequirements: {
    humanSubjects: boolean;
    irbNeeded: boolean;
    animalSamples: boolean;
    iacucNeeded: boolean;
    clinicalTrial: boolean;
  };
  collaborationRequirements: {
    outsideCollaborators: boolean;
    dataSharing: boolean;
  };
  budgetRequirements: {
    noCost: boolean;
    externalFunding: boolean;
    sidraBudget: boolean;
  };
  sampleDataProcessing: {
    collaborationWithPI: boolean;
    sidraCores: boolean;
  };
  
  // Duration and Core Labs
  durationMonths: number | null;
  coreLabs: string[];
  
  // Detailed Methods
  studyDesignMethods: string;
  proposalObjectives: string;
  preliminaryData: string;
}

const coreLabOptions = [
  "Genomics Core", "Omics Core", "Microscopy Core", "Flow Core",
  "Mass Spec Core", "Zebrafish Facility Core", "Advanced Cell Therapy Core",
  "Applied Bioinformatics Core", "Computational & Informatics Core",
  "Pathology", "HR (e.g. temp staffing)", "Research Contracts Office",
  "Research Scientific Data Management", "Grants Office"
];

export default function CreateRa200() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Ra200Form>({
    title: "",
    leadScientistId: null,
    projectId: null,
    budgetHolderId: null,
    budgetSource: "",
    abstract: "",
    backgroundRationale: "",
    objectivesPreliminary: "",
    approachMethods: "",
    discussionConclusion: "",
    ethicsRequirements: {
      humanSubjects: false,
      irbNeeded: false,
      animalSamples: false,
      iacucNeeded: false,
      clinicalTrial: false
    },
    collaborationRequirements: {
      outsideCollaborators: false,
      dataSharing: false
    },
    budgetRequirements: {
      noCost: false,
      externalFunding: false,
      sidraBudget: false
    },
    sampleDataProcessing: {
      collaborationWithPI: false,
      sidraCores: false
    },
    durationMonths: null,
    coreLabs: [],
    studyDesignMethods: "",
    proposalObjectives: "",
    preliminaryData: ""
  });

  // Load scientists and projects for dropdowns
  const { data: scientists = [] } = useQuery({
    queryKey: ['/api/scientists']
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });

  const createApplicationMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/pmo-applications', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pmo-applications'] });
      toast({ title: "RA-200 form created successfully!" });
      setLocation(`/pmo/applications/${data.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error creating form", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = (status: 'draft' | 'submitted') => {
    // Generate unique application ID
    const applicationId = `PMO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    
    const submitData = {
      ...formData,
      applicationId,
      status,
      formType: 'RA-200'
    };

    createApplicationMutation.mutate(submitData);
  };

  const handleCoreLabToggle = (labName: string) => {
    setFormData(prev => ({
      ...prev,
      coreLabs: prev.coreLabs.includes(labName)
        ? prev.coreLabs.filter(lab => lab !== labName)
        : [...prev.coreLabs, labName]
    }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setLocation('/pmo/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create RA-200 Research Activity Plan</h1>
          <p className="text-muted-foreground">Complete the research activity planning form</p>
        </div>
      </div>

      <Tabs defaultValue="guide" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="guide">User Guide</TabsTrigger>
          <TabsTrigger value="header">Header Info</TabsTrigger>
          <TabsTrigger value="research">Research Details</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="duration">Duration & Core Labs</TabsTrigger>
          <TabsTrigger value="methods">Detailed Methods</TabsTrigger>
        </TabsList>

        {/* User Guide */}
        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                RA-200 Research Activity Plan - User Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    What is the RA-200 Form?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    The RA-200 Research Activity Plan is a planning guide required before beginning any research study. 
                    It helps PMO office understand your research scope, requirements, and resource needs to ensure proper support and compliance.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg">Step-by-Step Completion Guide:</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full p-1 mt-0.5">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">1. Header Information</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Research Activity Title:</strong> Provide a clear, descriptive title for your research activity (SDR)<br/>
                          <strong>Lead Scientist:</strong> Select the principal investigator responsible for this research<br/>
                          <strong>Project ID:</strong> Link to the parent project (PRJ) this research falls under<br/>
                          <strong>Budget Holder:</strong> Identify who manages the budget for this activity<br/>
                          <strong>Budget Source:</strong> Specify funding amount and source (e.g., "13,000 QAR")
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full p-1 mt-0.5">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">2. Research Activity Details</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Abstract (Required):</strong> Summarize your planned research in 5000 characters. Include objectives, methods, and expected outcomes<br/>
                          <strong>Background & Rationale:</strong> Explain the scientific background and why this research is important<br/>
                          <strong>Objectives & Preliminary Work:</strong> List specific aims and any preliminary data you have<br/>
                          <strong>Approach/Methods:</strong> Briefly describe your experimental approach and methods<br/>
                          <strong>Discussion/Conclusion:</strong> Explain expected results and their significance
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-full p-1 mt-0.5">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">3. Requirements Assessment</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Ethics:</strong> Check if you need IRB approval for human subjects or IACUC for animal work<br/>
                          <strong>Collaborations:</strong> Indicate if you're working with external partners or sharing data<br/>
                          <strong>Budget:</strong> Specify your funding situation - no cost, external funding, or Sidra budget<br/>
                          <strong>Sample Processing:</strong> Choose between PI collaboration or using Sidra core facilities
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-full p-1 mt-0.5">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">4. Duration & Core Labs</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Duration:</strong> Estimate project length in months (typically 6-36 months)<br/>
                          <strong>Core Labs:</strong> Select all core facilities you'll need (Genomics, Omics, Microscopy, etc.)<br/>
                          <em>Note: Core lab selection helps PMO coordinate resources and estimate costs</em>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-full p-1 mt-0.5">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">5. Detailed Methods (Appendix A)</div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Study Design & Methods:</strong> Provide comprehensive methodology details<br/>
                          <strong>Proposal & Objectives:</strong> Elaborate on your research proposal and detailed objectives<br/>
                          <strong>Preliminary Data:</strong> Include any pilot data, proof-of-concept results, or preliminary achievements
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Tips for Success
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Be specific and detailed in your descriptions</li>
                      <li>• Include relevant citations and background research</li>
                      <li>• Clearly justify resource requirements</li>
                      <li>• Save drafts frequently during completion</li>
                      <li>• Review all sections before submission</li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Common Mistakes to Avoid
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Vague or overly broad research descriptions</li>
                      <li>• Missing ethics approval requirements</li>
                      <li>• Underestimating core lab needs</li>
                      <li>• Insufficient budget justification</li>
                      <li>• Submitting without thorough review</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Need Help?</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Contact PMO office: <strong>researchpmo@sidra.org</strong></div>
                    <div>• Refer to institutional research guidelines</div>
                    <div>• Consult with your program director or line manager</div>
                    <div>• Review approved applications as examples (ask PMO office)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Header Information */}
        <TabsContent value="header">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Header Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Sidra Research Activity ID (SDR) Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter the research activity title"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leadScientist">SDR Lead Scientist *</Label>
                  <Select
                    value={formData.leadScientistId?.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, leadScientistId: parseInt(value) }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select lead scientist" />
                    </SelectTrigger>
                    <SelectContent>
                      {scientists.map((scientist: any) => (
                        <SelectItem key={scientist.id} value={scientist.id.toString()}>
                          {scientist.firstName} {scientist.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project">Project ID (PRJ) *</Label>
                  <Select
                    value={formData.projectId?.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: parseInt(value) }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.projectId} - {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetHolder">PRJ Budget Holder/Line Manager *</Label>
                  <Select
                    value={formData.budgetHolderId?.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, budgetHolderId: parseInt(value) }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select budget holder" />
                    </SelectTrigger>
                    <SelectContent>
                      {scientists.map((scientist: any) => (
                        <SelectItem key={scientist.id} value={scientist.id.toString()}>
                          {scientist.firstName} {scientist.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budgetSource">Budget Source</Label>
                  <Input
                    id="budgetSource"
                    value={formData.budgetSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, budgetSource: e.target.value }))}
                    placeholder="e.g., 13,000 QAR"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Research Details */}
        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Research Activity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="abstract">Abstract (5000 characters max) *</Label>
                <Textarea
                  id="abstract"
                  value={formData.abstract}
                  onChange={(e) => setFormData(prev => ({ ...prev, abstract: e.target.value }))}
                  placeholder="Describe the planned research activities..."
                  rows={6}
                  maxLength={5000}
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formData.abstract.length}/5000 characters
                </div>
              </div>

              <div>
                <Label htmlFor="background">Background & Rationale</Label>
                <Textarea
                  id="background"
                  value={formData.backgroundRationale}
                  onChange={(e) => setFormData(prev => ({ ...prev, backgroundRationale: e.target.value }))}
                  placeholder="Provide background information and rationale..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="objectives">Objectives and Preliminary Work</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectivesPreliminary}
                  onChange={(e) => setFormData(prev => ({ ...prev, objectivesPreliminary: e.target.value }))}
                  placeholder="Describe objectives and any preliminary work..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="approach">Approach (Brief Summary of Methods)</Label>
                <Textarea
                  id="approach"
                  value={formData.approachMethods}
                  onChange={(e) => setFormData(prev => ({ ...prev, approachMethods: e.target.value }))}
                  placeholder="Provide a brief summary of the methods to be used..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="discussion">Discussion / Conclusion</Label>
                <Textarea
                  id="discussion"
                  value={formData.discussionConclusion}
                  onChange={(e) => setFormData(prev => ({ ...prev, discussionConclusion: e.target.value }))}
                  placeholder="Provide discussion and conclusion..."
                  rows={6}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements */}
        <TabsContent value="requirements">
          <div className="space-y-6">
            {/* Ethics Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Ethics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="humanSubjects"
                      checked={formData.ethicsRequirements.humanSubjects}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          ethicsRequirements: { ...prev.ethicsRequirements, humanSubjects: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="humanSubjects">Work with human-subject samples/data</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="irbNeeded"
                      checked={formData.ethicsRequirements.irbNeeded}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          ethicsRequirements: { ...prev.ethicsRequirements, irbNeeded: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="irbNeeded">IRB needed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="animalSamples"
                      checked={formData.ethicsRequirements.animalSamples}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          ethicsRequirements: { ...prev.ethicsRequirements, animalSamples: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="animalSamples">Work with animal samples</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="iacucNeeded"
                      checked={formData.ethicsRequirements.iacucNeeded}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          ethicsRequirements: { ...prev.ethicsRequirements, iacucNeeded: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="iacucNeeded">IACUC needed</Label>
                  </div>
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Checkbox
                      id="clinicalTrial"
                      checked={formData.ethicsRequirements.clinicalTrial}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          ethicsRequirements: { ...prev.ethicsRequirements, clinicalTrial: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="clinicalTrial">This is an interventional clinical trial</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collaborations */}
            <Card>
              <CardHeader>
                <CardTitle>Collaborations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="outsideCollaborators"
                      checked={formData.collaborationRequirements.outsideCollaborators}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          collaborationRequirements: { ...prev.collaborationRequirements, outsideCollaborators: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="outsideCollaborators">Work with collaborators outside Sidra</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dataSharing"
                      checked={formData.collaborationRequirements.dataSharing}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          collaborationRequirements: { ...prev.collaborationRequirements, dataSharing: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="dataSharing">Data will be shared outside Sidra</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget */}
            <Card>
              <CardHeader>
                <CardTitle>Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="noCost"
                      checked={formData.budgetRequirements.noCost}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          budgetRequirements: { ...prev.budgetRequirements, noCost: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="noCost">No Cost at all</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="externalFunding"
                      checked={formData.budgetRequirements.externalFunding}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          budgetRequirements: { ...prev.budgetRequirements, externalFunding: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="externalFunding">External party outside Sidra is covering costs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sidraBudget"
                      checked={formData.budgetRequirements.sidraBudget}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          budgetRequirements: { ...prev.budgetRequirements, sidraBudget: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="sidraBudget">Have a budget at Sidra for this research activity</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sample/Data Processing */}
            <Card>
              <CardHeader>
                <CardTitle>Sample/Data Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="collaborationWithPI"
                      checked={formData.sampleDataProcessing.collaborationWithPI}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          sampleDataProcessing: { ...prev.sampleDataProcessing, collaborationWithPI: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="collaborationWithPI">Lab work will be done in collaboration with a Sidra PI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sidraCores"
                      checked={formData.sampleDataProcessing.sidraCores}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          sampleDataProcessing: { ...prev.sampleDataProcessing, sidraCores: !!checked }
                        }))
                      }
                    />
                    <Label htmlFor="sidraCores">Lab work will be done by Sidra Cores</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Duration & Core Labs */}
        <TabsContent value="duration">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Duration of the Research Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="duration">Duration in Months *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.durationMonths || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || null }))}
                    placeholder="Enter duration in months"
                    min="1"
                    max="120"
                    className="mt-1 max-w-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Core Labs/Service Providers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select the areas where you require support:
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coreLabOptions.map((lab) => (
                    <div key={lab} className="flex items-center space-x-2">
                      <Checkbox
                        id={`corelab-${lab}`}
                        checked={formData.coreLabs.includes(lab)}
                        onCheckedChange={() => handleCoreLabToggle(lab)}
                      />
                      <Label htmlFor={`corelab-${lab}`} className="text-sm">
                        {lab}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Methods */}
        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle>Appendix A - Detailed Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="studyDesign">Study Design, Materials, Methods</Label>
                <Textarea
                  id="studyDesign"
                  value={formData.studyDesignMethods}
                  onChange={(e) => setFormData(prev => ({ ...prev, studyDesignMethods: e.target.value }))}
                  placeholder="Describe your study design, materials, and methods in detail..."
                  rows={8}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="proposalObjectives">Proposal and Objectives</Label>
                <Textarea
                  id="proposalObjectives"
                  value={formData.proposalObjectives}
                  onChange={(e) => setFormData(prev => ({ ...prev, proposalObjectives: e.target.value }))}
                  placeholder="Describe your proposal and detailed objectives..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="preliminaryData">Preliminary Data</Label>
                <Textarea
                  id="preliminaryData"
                  value={formData.preliminaryData}
                  onChange={(e) => setFormData(prev => ({ ...prev, preliminaryData: e.target.value }))}
                  placeholder="Describe any preliminary data or achievements..."
                  rows={6}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation('/pmo/applications')}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={createApplicationMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave('submitted')}
                disabled={createApplicationMutation.isPending || !formData.title}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}