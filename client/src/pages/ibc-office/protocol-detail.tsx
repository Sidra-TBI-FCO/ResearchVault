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
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Eye },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800", icon: XCircle },
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

  const { data: researchActivities = [] } = useQuery({
    queryKey: ["/api/ibc-applications", applicationId, "research-activities"],
    enabled: !!applicationId,
  });

  const { data: personnelData = [], isLoading: personnelLoading } = useQuery({
    queryKey: ["/api/ibc-applications", applicationId, "personnel"],
    enabled: !!applicationId,
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; reviewComments?: string }) => {
      return apiRequest("PATCH", `/api/ibc-applications/${applicationId}`, data);
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

  const currentStatus = IBC_WORKFLOW_STATUSES.find(s => s.value === application.status?.toLowerCase());
  const biosafetyLevel = BIOSAFETY_LEVELS.find(l => l.value === application.biosafetyLevel);
  const StatusIcon = currentStatus?.icon || FileText;

  const handleStatusUpdate = () => {
    if (!newWorkflowStatus) return;
    
    updateStatusMutation.mutate({
      status: newWorkflowStatus,
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

          {/* Linked Research Activities */}
          {researchActivities && researchActivities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Research Activities</CardTitle>
                <CardDescription>SDRs covered by this IBC protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {researchActivities.map((sdr: any) => (
                    <div key={sdr.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sdr.sdrNumber}</p>
                          <p className="text-sm text-gray-600">{sdr.title}</p>
                        </div>
                        <Badge variant="outline">{sdr.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="biosafety" className="space-y-4">
          <div className="space-y-6">
            {/* Biosafety Classification */}
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
                  {application.riskGroupClassification && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risk Group Classification</label>
                      <p className="text-sm">Risk Group {application.riskGroupClassification}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-500">Recombinant DNA Work</label>
                      <p className={application.recombinateDnaWork ? "text-orange-600" : "text-gray-600"}>
                        {application.recombinateDnaWork ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Cell Lines Usage</label>
                      <p className={application.cellLinesUsage ? "text-orange-600" : "text-gray-600"}>
                        {application.cellLinesUsage ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Animal Work</label>
                      <p className={application.animalWork ? "text-orange-600" : "text-gray-600"}>
                        {application.animalWork ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Large Scale Work</label>
                      <p className={application.largeScaleWork ? "text-orange-600" : "text-gray-600"}>
                        {application.largeScaleWork ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Safety Protocols</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.containmentProcedures && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Containment Procedures</label>
                      <p className="text-sm whitespace-pre-wrap">{application.containmentProcedures}</p>
                    </div>
                  )}
                  {application.emergencyProcedures && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Emergency Procedures</label>
                      <p className="text-sm whitespace-pre-wrap">{application.emergencyProcedures}</p>
                    </div>
                  )}
                  {application.ppeRequirements && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">PPE Requirements</label>
                      <p className="text-sm whitespace-pre-wrap">{application.ppeRequirements}</p>
                    </div>
                  )}
                  {application.wasteSterilizationProcedures && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Waste Sterilization</label>
                      <p className="text-sm whitespace-pre-wrap">{application.wasteSterilizationProcedures}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Methods and Procedures */}
            <Card>
              <CardHeader>
                <CardTitle>Methods and Procedures</CardTitle>
                <CardDescription>Detailed experimental procedures and protocols</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.materialAndMethods && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Materials and Methods</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.materialAndMethods}</p>
                  </div>
                )}
                
                {application.proceduresInvolvingInfectiousAgents && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Procedures Involving Infectious Agents</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.proceduresInvolvingInfectiousAgents}</p>
                  </div>
                )}
                
                {application.cellCultureProcedures && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cell Culture Procedures</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.cellCultureProcedures}</p>
                  </div>
                )}
                
                {application.nucleicAcidExtractionMethods && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nucleic Acid Extraction Methods</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.nucleicAcidExtractionMethods}</p>
                  </div>
                )}
                
                {application.animalProcedures && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Animal Procedures</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.animalProcedures}</p>
                  </div>
                )}

                {application.laboratoryEquipment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Laboratory Equipment</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.laboratoryEquipment}</p>
                  </div>
                )}

                {application.disinfectionMethods && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Disinfection Methods</label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{application.disinfectionMethods}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Biological Agents */}
            {(application.agents || application.biologicalAgents) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Biological Agents</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.agents && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Agents Description</label>
                      <p className="text-sm whitespace-pre-wrap">{application.agents}</p>
                    </div>
                  )}
                  {application.biologicalAgents && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Biological Agents List</label>
                      <p className="text-sm">{JSON.stringify(application.biologicalAgents)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          <div className="space-y-6">
            {/* Principal Investigator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Principal Investigator</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scientist ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{scientist.name}</p>
                      <p className="text-sm text-gray-500">{scientist.email}</p>
                      <p className="text-sm text-gray-500">{scientist.department}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Loading...</p>
                      <p className="text-sm text-gray-400">Principal Investigator information</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>



            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription>
                  Personnel authorized to work with this protocol
                </CardDescription>
              </CardHeader>
              <CardContent>
                {personnelLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ) : personnelData && personnelData.length > 0 ? (
                  <div className="space-y-4">
                    {personnelData.map((member: any) => (
                      <div key={`${member.scientistId}-${member.role}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">{member.scientist?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{member.scientist?.email || ''}</p>
                            <p className="text-sm text-gray-500">{member.scientist?.department || ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={
                            member.role === 'team_leader' ? 'bg-blue-100 text-blue-800' :
                            member.role === 'safety_representative' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {member.role === 'team_leader' ? 'Team Leader' :
                             member.role === 'safety_representative' ? 'Safety Representative' :
                             'Team Member'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No team members defined for this protocol
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Training and Safety Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500`} />
                    <span className="text-sm">Biosafety Level {application.biosafetyLevel?.replace('BSL-', '')} Training</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500`} />
                    <span className="text-sm">Laboratory Safety Protocols</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${application.animalWork ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Animal Handling (if applicable)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${application.recombinateDnaWork ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Recombinant DNA Protocols (if applicable)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Safety Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${application.medicalSurveillance ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Medical Surveillance Required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500`} />
                    <span className="text-sm">Personal Protective Equipment</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500`} />
                    <span className="text-sm">Emergency Response Training</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-green-500`} />
                    <span className="text-sm">Waste Management Protocols</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="facilities" className="space-y-4">
          <div className="space-y-6">
            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Location Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Research Location</label>
                    <p className="text-sm">{application.location}</p>
                  </div>
                )}
                
                {application.buildingName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Building</label>
                    <p className="text-sm">{application.buildingName}</p>
                  </div>
                )}
                
                {application.roomNumbers && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Room Numbers</label>
                    <p className="text-sm">{application.roomNumbers}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approved Rooms & Facilities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Home className="h-5 w-5" />
                    <span>Approved Rooms & Facilities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.approvedRooms && Array.isArray(application.approvedRooms) && application.approvedRooms.length > 0 ? (
                    <div className="space-y-2">
                      {application.approvedRooms.map((room: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <Home className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{room}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No specific rooms listed</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Facility Safety</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-green-500`} />
                      <span className="text-sm">Biosafety Level {application.biosafetyLevel?.replace('BSL-', '')} Facility</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-green-500`} />
                      <span className="text-sm">Containment Protocols Active</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-green-500`} />
                      <span className="text-sm">Emergency Equipment Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-green-500`} />
                      <span className="text-sm">Waste Management System</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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