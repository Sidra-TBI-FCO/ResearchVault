import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  Users,
  Building,
  Biohazard,
  Shield,
  Home,
  Send,
  Eye,
  Calendar
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { IbcApplication, Scientist, IbcBoardMember } from "@shared/schema";

const IBC_WORKFLOW_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800", icon: Send },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Eye },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
];

const BIOSAFETY_LEVELS = [
  { value: "BSL-1", label: "BSL-1", color: "bg-green-100 text-green-800", description: "Minimal risk" },
  { value: "BSL-2", label: "BSL-2", color: "bg-yellow-100 text-yellow-800", description: "Moderate risk" },
  { value: "BSL-3", label: "BSL-3", color: "bg-orange-100 text-orange-800", description: "High risk" },
  { value: "BSL-4", label: "BSL-4", color: "bg-red-100 text-red-800", description: "Extreme danger" }
];

export default function IbcProtocolDetailPage() {
  const [, params] = useRoute("/ibc-office/protocol-detail/:id");
  const applicationId = params?.id ? parseInt(params.id) : null;
  const [newWorkflowStatus, setNewWorkflowStatus] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: application, isLoading: applicationLoading } = useQuery({
    queryKey: ["/api/ibc-applications", applicationId],
    enabled: !!applicationId,
  });

  const { data: scientist } = useQuery({
    queryKey: ["/api/scientists", application?.principalInvestigatorId],
    enabled: !!application?.principalInvestigatorId,
  });

  const { data: boardMembers = [] } = useQuery({
    queryKey: ["/api/ibc-board-members"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { workflowStatus: string; reviewComments?: string }) => {
      return apiRequest(`/api/ibc-applications/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ibc-applications", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ibc-applications"] });
      toast({
        title: "Status Updated",
        description: "Application status has been updated successfully.",
      });
      setNewWorkflowStatus("");
      setReviewComments("");
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
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentStatus = IBC_WORKFLOW_STATUSES.find(s => s.value === application.workflowStatus);
  const biosafetyLevel = BIOSAFETY_LEVELS.find(l => l.value === application.biosafetyLevel);
  const StatusIcon = currentStatus?.icon || FileText;

  const handleStatusUpdate = () => {
    if (!newWorkflowStatus) return;
    
    updateStatusMutation.mutate({
      workflowStatus: newWorkflowStatus,
      reviewComments: reviewComments || undefined,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-bold">IBC Protocol Review</h1>
          </div>
          <p className="text-gray-600">{application.ibcNumber}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={currentStatus?.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {currentStatus?.label}
          </Badge>
          {biosafetyLevel && (
            <Badge className={biosafetyLevel.color}>
              <Biohazard className="h-3 w-3 mr-1" />
              {biosafetyLevel.label}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="biosafety">Biosafety Details</TabsTrigger>
          <TabsTrigger value="personnel">Personnel & Training</TabsTrigger>
          <TabsTrigger value="facilities">Facilities & Rooms</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Management</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Protocol Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="font-medium">{application.title}</p>
                </div>
                {application.shortTitle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Short Title</label>
                    <p className="text-sm">{application.shortTitle}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Principal Investigator</label>
                  <p className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{scientist?.name}</span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IBC Number</label>
                  <p className="font-mono">{application.ibcNumber}</p>
                </div>
                {application.cayuseProtocolNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cayuse Protocol Number</label>
                    <p className="font-mono">{application.cayuseProtocolNumber}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Risk Level</label>
                  <Badge variant="outline" className={
                    application.riskLevel === 'high' ? 'border-red-200 text-red-800' :
                    application.riskLevel === 'moderate' ? 'border-yellow-200 text-yellow-800' :
                    'border-green-200 text-green-800'
                  }>
                    {application.riskLevel?.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.submissionDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Submitted</p>
                      <p className="text-sm text-gray-500">
                        {new Date(application.submissionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {application.approvalDate && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Approved</p>
                      <p className="text-sm text-gray-500">
                        {new Date(application.approvalDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {application.expirationDate && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Expires</p>
                      <p className="text-sm text-gray-500">
                        {new Date(application.expirationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {application.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="biosafety" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Biohazard className="h-5 w-5" />
                  <span>Biosafety Classification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Biosafety Level</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={biosafetyLevel?.color}>
                      {biosafetyLevel?.label}
                    </Badge>
                    <span className="text-sm text-gray-500">{biosafetyLevel?.description}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-500">Recombinant DNA</label>
                    <p className={application.recombinantDNA ? "text-orange-600" : "text-gray-600"}>
                      {application.recombinantDNA ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Human Materials</label>
                    <p className={application.humanMaterials ? "text-orange-600" : "text-gray-600"}>
                      {application.humanMaterials ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Animal Work</label>
                    <p className={application.animalWork ? "text-orange-600" : "text-gray-600"}>
                      {application.animalWork ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-500">Field Work</label>
                    <p className={application.fieldWork ? "text-orange-600" : "text-gray-600"}>
                      {application.fieldWork ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Hazardous Materials</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.biologicalAgents && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Biological Agents</label>
                    <p className="text-sm">{JSON.stringify(application.biologicalAgents)}</p>
                  </div>
                )}
                {application.chemicalAgents && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Chemical Agents</label>
                    <p className="text-sm">{JSON.stringify(application.chemicalAgents)}</p>
                  </div>
                )}
                {application.radiologicalMaterials && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Radiological Materials</label>
                    <p className="text-sm">{JSON.stringify(application.radiologicalMaterials)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Authorized Personnel</span>
              </CardTitle>
              <CardDescription>
                Personnel authorized to work with this protocol and their training requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.authorizedPersonnel && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Authorized Personnel</label>
                  <p className="text-sm">{JSON.stringify(application.authorizedPersonnel)}</p>
                </div>
              )}
              {application.trainingRequirements && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Training Requirements</label>
                  <p className="text-sm">{JSON.stringify(application.trainingRequirements)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Medical Surveillance Required</label>
                <p className={application.medicalSurveillance ? "text-orange-600" : "text-gray-600"}>
                  {application.medicalSurveillance ? "Yes" : "No"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Home className="h-5 w-5" />
                  <span>Approved Rooms & Facilities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.approvedRooms && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Approved Rooms</label>
                    <p className="text-sm">{JSON.stringify(application.approvedRooms)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Safety Procedures</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.containmentProcedures && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Containment Procedures</label>
                    <p className="text-sm whitespace-pre-wrap">{application.containmentProcedures}</p>
                  </div>
                )}
                {application.wasteDisposalPlan && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Waste Disposal Plan</label>
                    <p className="text-sm whitespace-pre-wrap">{application.wasteDisposalPlan}</p>
                  </div>
                )}
                {application.emergencyProcedures && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Emergency Procedures</label>
                    <p className="text-sm whitespace-pre-wrap">{application.emergencyProcedures}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Management</CardTitle>
              <CardDescription>
                Update the application status and add review comments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Update Status</label>
                  <Select value={newWorkflowStatus} onValueChange={setNewWorkflowStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {IBC_WORKFLOW_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={!newWorkflowStatus || updateStatusMutation.isPending}
                    className="w-full"
                  >
                    {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Review Comments</label>
                <Textarea
                  placeholder="Add comments about this status change..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={4}
                />
              </div>

              {application.reviewComments && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Previous Comments</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{JSON.stringify(application.reviewComments)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>
                Protocol documents and supporting materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management</h3>
                <p className="text-gray-500">Document management system will be available in a future update.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}