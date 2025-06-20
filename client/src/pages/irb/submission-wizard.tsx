import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, FileText, Upload, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { IrbApplication, ResearchActivity, Scientist } from "@shared/schema";

interface SubmissionWizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function IrbSubmissionWizard() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const applicationId = parseInt(params.id);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Information
    title: "",
    shortTitle: "",
    description: "",
    studyDesign: "",
    expectedParticipants: "",
    studyDuration: "",
    fundingSource: "",
    
    // Risk Assessment
    riskLevel: "",
    vulnerablePopulations: [] as string[],
    dataCollectionMethods: [] as string[],
    conflictOfInterest: false,
    multiSite: false,
    internationalSites: false,
    
    // Regulatory Information
    protocolType: "",
    isInterventional: false,
    requiresMonitoring: false,
    monitoringFrequency: "",
    
    // Documents
    uploadedDocuments: [] as any[],
    
    // Additional IRB-specific fields based on real forms
    irbNetNumber: "",
    oldNumber: "",
    additionalNotificationEmail: "",
    subjectEnrollmentReasons: [] as string[],
    reportingRequirements: [] as string[],
  });

  const steps: SubmissionWizardStep[] = [
    {
      id: "basic",
      title: "Basic Information",
      description: "Study title, description, and basic details",
      completed: formData.title && formData.description && formData.studyDesign
    },
    {
      id: "risk",
      title: "Risk Assessment",
      description: "Risk level, populations, and data collection methods",
      completed: formData.riskLevel && formData.dataCollectionMethods.length > 0
    },
    {
      id: "regulatory",
      title: "Regulatory Details",
      description: "Protocol type, intervention status, and monitoring",
      completed: formData.protocolType
    },
    {
      id: "documents",
      title: "Documents",
      description: "Upload required protocol documents",
      completed: formData.uploadedDocuments.length >= 3 // At least 3 required documents
    },
    {
      id: "review",
      title: "Review & Submit",
      description: "Review your submission before submitting to IRB",
      completed: false
    }
  ];

  const { data: application } = useQuery<IrbApplication>({
    queryKey: [`/api/irb-applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const { data: researchActivity } = useQuery<ResearchActivity>({
    queryKey: [`/api/research-activities/${application?.researchActivityId}`],
    enabled: !!application?.researchActivityId,
  });

  const { data: scientists = [] } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (submissionData: any) => {
      const response = await fetch(`/api/irb-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          workflowStatus: 'submitted',
          submissionDate: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to submit application');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/irb-applications/${applicationId}`] });
      toast({ title: "Success", description: "IRB application submitted successfully" });
      navigate(`/irb-applications/${applicationId}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit application", variant: "destructive" });
    },
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayField = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    submitApplicationMutation.mutate({
      ...formData,
      formData: formData,
      expectedParticipants: formData.expectedParticipants ? parseInt(formData.expectedParticipants) : null,
    });
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case "basic":
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Study Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                placeholder="Enter the full study title"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="shortTitle">Short Title</Label>
              <Input
                id="shortTitle"
                value={formData.shortTitle}
                onChange={(e) => updateFormData('shortTitle', e.target.value)}
                placeholder="Enter a short title for easy recognition"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Study Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Provide a detailed description of your study..."
                className="mt-1 min-h-[120px]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studyDesign">Study Design *</Label>
                <Select value={formData.studyDesign} onValueChange={(value) => updateFormData('studyDesign', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select study design" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observational">Observational</SelectItem>
                    <SelectItem value="interventional">Interventional</SelectItem>
                    <SelectItem value="survey">Survey/Questionnaire</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="focus_group">Focus Group</SelectItem>
                    <SelectItem value="chart_review">Chart Review</SelectItem>
                    <SelectItem value="database_analysis">Database Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expectedParticipants">Expected Participants</Label>
                <Input
                  id="expectedParticipants"
                  type="number"
                  value={formData.expectedParticipants}
                  onChange={(e) => updateFormData('expectedParticipants', e.target.value)}
                  placeholder="Number of participants"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studyDuration">Study Duration</Label>
                <Input
                  id="studyDuration"
                  value={formData.studyDuration}
                  onChange={(e) => updateFormData('studyDuration', e.target.value)}
                  placeholder="e.g., 12 months, 2 years"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="fundingSource">Funding Source</Label>
                <Input
                  id="fundingSource"
                  value={formData.fundingSource}
                  onChange={(e) => updateFormData('fundingSource', e.target.value)}
                  placeholder="Source of funding"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="irbNetNumber">IRBNet Number (if applicable)</Label>
                <Input
                  id="irbNetNumber"
                  value={formData.irbNetNumber}
                  onChange={(e) => updateFormData('irbNetNumber', e.target.value)}
                  placeholder="IRBNet allocated number"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="additionalNotificationEmail">Additional Notification Email</Label>
                <Input
                  id="additionalNotificationEmail"
                  type="email"
                  value={formData.additionalNotificationEmail}
                  onChange={(e) => updateFormData('additionalNotificationEmail', e.target.value)}
                  placeholder="Additional email for notifications"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label>Subject Enrollment Reasons</Label>
              <p className="text-sm text-gray-600 mb-3">Select all reasons for subject enrollment:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "sample_collection", "data_collection", "intervention_testing", 
                  "survey_completion", "interview_participation", "follow_up_monitoring"
                ].map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <Checkbox
                      id={reason}
                      checked={formData.subjectEnrollmentReasons.includes(reason)}
                      onCheckedChange={(checked) => handleArrayField('subjectEnrollmentReasons', reason, checked as boolean)}
                    />
                    <Label htmlFor={reason} className="capitalize">
                      {reason.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "risk":
        return (
          <div className="space-y-6">
            <div>
              <Label>Risk Level *</Label>
              <div className="grid grid-cols-1 gap-3 mt-2">
                {[
                  { value: "minimal", label: "Minimal Risk", description: "No greater than everyday life or routine examinations" },
                  { value: "greater_than_minimal", label: "Greater than Minimal Risk", description: "Probability and magnitude of harm greater than minimal risk" },
                  { value: "high", label: "High Risk", description: "Significant risk of serious harm to participants" }
                ].map((risk) => (
                  <div key={risk.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <input
                      type="radio"
                      id={risk.value}
                      name="riskLevel"
                      value={risk.value}
                      checked={formData.riskLevel === risk.value}
                      onChange={(e) => updateFormData('riskLevel', e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor={risk.value} className="font-medium">{risk.label}</Label>
                      <p className="text-sm text-gray-600 mt-1">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Vulnerable Populations</Label>
              <p className="text-sm text-gray-600 mb-3">Select all that apply to your study:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "children", "pregnant_women", "prisoners", "mentally_disabled", 
                  "economically_disadvantaged", "elderly", "students", "employees"
                ].map((population) => (
                  <div key={population} className="flex items-center space-x-2">
                    <Checkbox
                      id={population}
                      checked={formData.vulnerablePopulations.includes(population)}
                      onCheckedChange={(checked) => handleArrayField('vulnerablePopulations', population, checked as boolean)}
                    />
                    <Label htmlFor={population} className="capitalize">
                      {population.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Data Collection Methods *</Label>
              <p className="text-sm text-gray-600 mb-3">Select all methods you will use:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "surveys", "interviews", "medical_records", "biological_samples",
                  "imaging", "observations", "existing_datasets", "device_data"
                ].map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={method}
                      checked={formData.dataCollectionMethods.includes(method)}
                      onCheckedChange={(checked) => handleArrayField('dataCollectionMethods', method, checked as boolean)}
                    />
                    <Label htmlFor={method} className="capitalize">
                      {method.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conflictOfInterest"
                  checked={formData.conflictOfInterest}
                  onCheckedChange={(checked) => updateFormData('conflictOfInterest', checked)}
                />
                <Label htmlFor="conflictOfInterest">
                  The investigator has a financial conflict of interest
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiSite"
                  checked={formData.multiSite}
                  onCheckedChange={(checked) => updateFormData('multiSite', checked)}
                />
                <Label htmlFor="multiSite">
                  This is a multi-site study
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internationalSites"
                  checked={formData.internationalSites}
                  onCheckedChange={(checked) => updateFormData('internationalSites', checked)}
                />
                <Label htmlFor="internationalSites">
                  Study includes international sites
                </Label>
              </div>
            </div>
          </div>
        );

      case "regulatory":
        return (
          <div className="space-y-6">
            <div>
              <Label>Protocol Review Type *</Label>
              <Select value={formData.protocolType} onValueChange={(value) => updateFormData('protocolType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select review type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exempt">Exempt Review</SelectItem>
                  <SelectItem value="expedited">Expedited Review</SelectItem>
                  <SelectItem value="full_board">Full Board Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isInterventional"
                checked={formData.isInterventional}
                onCheckedChange={(checked) => updateFormData('isInterventional', checked)}
              />
              <Label htmlFor="isInterventional">
                This is an interventional clinical study
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresMonitoring"
                checked={formData.requiresMonitoring}
                onCheckedChange={(checked) => updateFormData('requiresMonitoring', checked)}
              />
              <Label htmlFor="requiresMonitoring">
                This study requires ongoing monitoring
              </Label>
            </div>
            
            {formData.requiresMonitoring && (
              <div>
                <Label>Monitoring Frequency</Label>
                <Select value={formData.monitoringFrequency} onValueChange={(value) => updateFormData('monitoringFrequency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select monitoring frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annually">Semi-annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Required Documents</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    Please upload all required documents for your IRB submission. All documents must be in PDF format.
                  </p>
                  <div className="mt-2">
                    <Link href="/irb/templates">
                      <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                        Download Templates
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { type: "protocol", label: "Research Protocol (IRB-413)", required: true, description: "Clinical Research Protocol using IRB-413 template" },
                { type: "consent_form", label: "Informed Consent Form (IRB-400)", required: true, description: "Completed IRB-400 consent form in English/Arabic" },
                { type: "investigator_cv", label: "Principal Investigator CV", required: true, description: "Current CV of the PI with research experience" },
                { type: "study_team_cv", label: "Study Team CVs", required: true, description: "CVs of all co-investigators and key personnel" },
                { type: "data_safety_plan", label: "Data Safety & Security Plan", required: true, description: "Plan for data protection and confidentiality" },
                { type: "recruitment_materials", label: "Recruitment Materials", required: false, description: "Flyers, advertisements, or recruitment scripts" },
                { type: "survey_instruments", label: "Survey/Data Collection Instruments", required: false, description: "Questionnaires, surveys, or data collection forms" },
                { type: "site_approval", label: "Site Approval Letters", required: false, description: "Letters from collaborating institutions (if multi-site)" },
                { type: "regulatory_approvals", label: "Regulatory Approvals", required: false, description: "FDA/EMA approvals for investigational products" },
                { type: "insurance_coverage", label: "Insurance Coverage Letter", required: false, description: "Proof of research insurance coverage" },
              ].map((doc) => (
                <div key={doc.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{doc.label}</span>
                      {doc.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <span className="text-sm text-gray-500">No file selected • PDF format only</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900">Ready to Submit</h3>
                  <p className="text-sm text-green-800 mt-1">
                    Please review your submission below. Once submitted, your application will be routed to the IRB office for review.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Study Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Title:</strong> {formData.title}</div>
                  <div><strong>Study Design:</strong> {formData.studyDesign}</div>
                  <div><strong>Risk Level:</strong> {formData.riskLevel}</div>
                  <div><strong>Protocol Type:</strong> {formData.protocolType}</div>
                  <div><strong>Expected Participants:</strong> {formData.expectedParticipants}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Collection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {formData.dataCollectionMethods.map((method) => (
                      <Badge key={method} variant="outline">
                        {method.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!application) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/irb")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to IRB Applications
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-neutral-400 mb-2">IRB Submission Wizard</h1>
        <p className="text-neutral-300">
          Complete your IRB application submission step by step
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= currentStep 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
                ${step.completed ? 'bg-green-500' : ''}
              `}>
                {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <div className="text-xs mt-2 text-center max-w-20">
                {step.title}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`
                w-16 h-px mx-4
                ${index < currentStep ? 'bg-primary-500' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <p className="text-neutral-300">{steps[currentStep].description}</p>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!steps[currentStep].completed}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitApplicationMutation.isPending}
              className="bg-primary-500 hover:bg-primary-600"
            >
              {submitApplicationMutation.isPending ? "Submitting..." : "Submit to IRB"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}