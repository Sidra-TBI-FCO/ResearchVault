import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Upload, Download, FileText, Users, CheckCircle, 
  AlertCircle, Clock, Signature, Plus, X, Eye 
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { IrbApplication, ResearchActivity, Scientist, ProjectMember } from "@shared/schema";

interface DocumentUpload {
  id: string;
  name: string;
  type: 'consent_form' | 'protocol' | 'recruitment' | 'data_safety' | 'other';
  required: boolean;
  uploaded: boolean;
  signatureRequired: boolean;
  signatures: { scientistId: number; signedAt: string; signedBy: string }[];
}

interface ProtocolMember {
  id: number;
  scientistId: number;
  name: string;
  email: string;
  roles: string[]; // Multiple roles per member
  hasAccess: boolean;
  hasSigned: boolean;
  signedAt?: string;
}

const PROTOCOL_ROLES = [
  'Research Enrolment',
  'Clinical Data Manager', 
  'Sample/Lab Manager',
  'Report Manager',
  'Metadata Manager',
  'PHI Data Manager',
  'PHI Data Reader',
  'PHI Reports'
] as const;

export default function ProtocolAssembly() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const applicationId = parseInt(params.id);
  
  const [selectedScientistId, setSelectedScientistId] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [protocolMembers, setProtocolMembers] = useState<ProtocolMember[]>([]);

  const { data: application, isLoading } = useQuery<IrbApplication>({
    queryKey: [`/api/irb-applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const { data: researchActivity } = useQuery<ResearchActivity>({
    queryKey: [`/api/research-activities/${application?.researchActivityId}`],
    enabled: !!application?.researchActivityId,
  });

  const { data: projectMembers = [] } = useQuery<ProjectMember[]>({
    queryKey: [`/api/research-activities/${application?.researchActivityId}/members`],
    enabled: !!application?.researchActivityId,
  });

  // Filter available scientists to only SDR team members
  const availableScientists = projectMembers.filter(
    member => !protocolMembers.some(pm => pm.scientistId === member.scientistId)
  );

  // Mock document requirements for demonstration
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    {
      id: '1',
      name: 'IRB-400 Informed Consent Form',
      type: 'consent_form',
      required: true,
      uploaded: false,
      signatureRequired: true,
      signatures: []
    },
    {
      id: '2', 
      name: 'IRB-413 Clinical Research Protocol',
      type: 'protocol',
      required: true,
      uploaded: false,
      signatureRequired: true,
      signatures: []
    },
    {
      id: '3',
      name: 'IRB-417 Serious Adverse Events Form',
      type: 'data_safety',
      required: true,
      uploaded: false,
      signatureRequired: false,
      signatures: []
    },
    {
      id: '4',
      name: 'Recruitment Materials',
      type: 'recruitment',
      required: false,
      uploaded: false,
      signatureRequired: false,
      signatures: []
    }
  ]);

  const handleFileUpload = (documentId: string, file: File) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, uploaded: true }
        : doc
    ));
    
    toast({
      title: "Document Uploaded",
      description: `${file.name} has been uploaded successfully.`
    });
  };

  const handleSignDocument = (documentId: string) => {
    // In a real app, this would trigger a digital signature process
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { 
            ...doc, 
            signatures: [
              ...doc.signatures,
              {
                scientistId: 1, // Current user
                signedAt: new Date().toISOString(),
                signedBy: "Dr. Emily Chen" // Current user name
              }
            ]
          }
        : doc
    ));
    
    toast({
      title: "Document Signed",
      description: "Your digital signature has been applied."
    });
  };

  const isReadyForSubmission = () => {
    const requiredDocs = documents.filter(doc => doc.required);
    const uploadedRequired = requiredDocs.filter(doc => doc.uploaded);
    const signedRequired = requiredDocs.filter(doc => 
      !doc.signatureRequired || doc.signatures.length > 0
    );
    
    return uploadedRequired.length === requiredDocs.length && 
           signedRequired.length === requiredDocs.length;
  };

  const addProtocolMemberMutation = useMutation({
    mutationFn: async ({ scientistId, roles }: { scientistId: number; roles: string[] }) => {
      const projectMember = projectMembers.find(pm => pm.scientistId === scientistId);
      if (!projectMember?.scientist) throw new Error('Team member not found in SDR');
      
      const newMember: ProtocolMember = {
        id: Date.now(), // Temporary ID
        scientistId,
        name: projectMember.scientist.name,
        email: projectMember.scientist.email || `${projectMember.scientist.name.toLowerCase().replace(/\s+/g, '.')}@sidra.org`,
        roles,
        hasAccess: true,
        hasSigned: false,
      };
      
      setProtocolMembers(prev => [...prev, newMember]);
      return newMember;
    },
    onSuccess: () => {
      toast({
        title: "Member Added",
        description: "Protocol member has been added successfully."
      });
      setSelectedScientistId(null);
      setSelectedRoles([]);
      setShowAddMember(false);
    },
  });

  const removeProtocolMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      setProtocolMembers(prev => prev.filter(m => m.id !== memberId));
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Protocol member has been removed."
      });
    },
  });

  const submitProtocolMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/irb-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowStatus: 'submitted',
          submissionDate: new Date().toISOString(),
          documents: JSON.stringify(documents)
        }),
      });
      if (!response.ok) throw new Error('Failed to submit protocol');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/irb-applications/${applicationId}`] });
      toast({
        title: "Protocol Submitted",
        description: "Your IRB protocol has been submitted for review."
      });
      navigate(`/irb/${applicationId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit protocol",
        variant: "destructive"
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!application) {
    return <div>Application not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/irb/${applicationId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Application
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Protocol Assembly</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Protocol Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Protocol Information</span>
                <Badge variant={application.workflowStatus === 'draft' ? 'secondary' : 'default'}>
                  {(application.workflowStatus || 'draft').replace('_', ' ')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Title:</span> {application.title}
                </div>
                <div>
                  <span className="font-medium">IRB Number:</span> {application.irbNumber}
                </div>
                {researchActivity && (
                  <div>
                    <span className="font-medium">Research Activity:</span> {researchActivity.sdrNumber} - {researchActivity.title}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((document) => (
                  <div key={document.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{document.name}</span>
                        {document.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {document.signatureRequired && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                            Signature Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {document.uploaded ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {!document.uploaded ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(document.id, file);
                              }
                            }}
                            className="hidden"
                            id={`file-${document.id}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`file-${document.id}`)?.click()}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {document.signatureRequired && document.signatures.length === 0 && (
                            <Button 
                              size="sm"
                              onClick={() => handleSignDocument(document.id)}
                            >
                              <Signature className="h-4 w-4 mr-1" />
                              Sign Document
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {document.signatures.length > 0 && (
                      <div className="text-sm text-green-600">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Signed by {document.signatures[0].signedBy} on{' '}
                          {new Date(document.signatures[0].signedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Protocol Team Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Protocol Team Members
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  disabled={!application?.researchActivityId || availableScientists.length === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAddMember && (
                <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add Protocol Team Member</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select SDR Team Member</label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        value={selectedScientistId || ''}
                        onChange={(e) => setSelectedScientistId(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Choose from SDR team members...</option>
                        {availableScientists.map((member) => (
                          <option key={member.scientistId} value={member.scientistId}>
                            {member.scientist?.name} - {member.role}
                          </option>
                        ))}
                      </select>
                      {availableScientists.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          All SDR team members have already been added to the protocol team.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium">Protocol Roles (Select Multiple)</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {PROTOCOL_ROLES.map((role) => (
                          <label key={role} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedRoles.includes(role)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRoles(prev => [...prev, role]);
                                } else {
                                  setSelectedRoles(prev => prev.filter(r => r !== role));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (selectedScientistId && selectedRoles.length > 0) {
                            addProtocolMemberMutation.mutate({
                              scientistId: selectedScientistId,
                              roles: selectedRoles
                            });
                          }
                        }}
                        disabled={!selectedScientistId || selectedRoles.length === 0 || addProtocolMemberMutation.isPending}
                      >
                        {addProtocolMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddMember(false);
                          setSelectedScientistId(null);
                          setSelectedRoles([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {protocolMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {member.hasAccess ? 'Access Granted' : 'No Access'}
                      </Badge>
                      {member.hasSigned ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          Pending Signature
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeProtocolMemberMutation.mutate(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {protocolMembers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No protocol team members assigned yet. Add SDR team members to grant access and assign protocol-specific roles.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submission Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.filter(doc => doc.required).map((document) => (
                  <div key={document.id} className="flex items-center gap-2">
                    {document.uploaded ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm">{document.name}</span>
                  </div>
                ))}
                
                <Separator className="my-3" />
                
                <div className="flex items-center gap-2">
                  {isReadyForSubmission() ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-sm font-medium">
                    {isReadyForSubmission() ? 'Ready for Submission' : 'Pending Requirements'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full"
                disabled={!isReadyForSubmission() || submitProtocolMutation.isPending}
                onClick={() => submitProtocolMutation.mutate()}
              >
                {submitProtocolMutation.isPending ? 'Submitting...' : 'Submit for IRB Review'}
              </Button>
              
              <Button variant="outline" className="w-full">
                Save as Draft
              </Button>
              
              <Button variant="outline" className="w-full">
                Download Protocol Package
              </Button>
            </CardContent>
          </Card>

          {/* Protocol Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                IRB-400 Consent Form Template
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                IRB-413 Protocol Template
              </Button>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                IRB-417 Adverse Events Form
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}