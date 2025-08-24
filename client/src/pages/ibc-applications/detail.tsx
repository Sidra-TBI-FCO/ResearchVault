import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, IbcApplication, Scientist } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, User, Beaker, AlertCircle, CheckCircle2, Edit, Clock, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { usePublicationCount } from "@/hooks/use-publication-count";
import TimelineComments from "@/components/TimelineComments";

export default function IbcApplicationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: ibcApplication, isLoading: ibcApplicationLoading } = useQuery<IbcApplication>({
    queryKey: ['/api/ibc-applications', id],
    queryFn: async () => {
      const response = await fetch(`/api/ibc-applications/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IBC application');
      }
      return response.json();
    },
  });

  // Fetch associated research activities for this IBC application
  const { data: associatedActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/ibc-applications', id, 'research-activities'],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/ibc-applications/${id}/research-activities`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activities for IBC application');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch comments for this IBC application
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/ibc-applications/${id}/comments`],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: principalInvestigator, isLoading: piLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', ibcApplication?.principalInvestigatorId],
    queryFn: async () => {
      if (!ibcApplication?.principalInvestigatorId) return null;
      const response = await fetch(`/api/scientists/${ibcApplication.principalInvestigatorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch principal investigator');
      }
      return response.json();
    },
    enabled: !!ibcApplication?.principalInvestigatorId,
  });

  // Parse team members data and get scientist IDs
  const { teamMemberIds, teamMembersData } = (() => {
    let teamMembers = [];
    try {
      if (ibcApplication?.protocolTeamMembers && typeof ibcApplication.protocolTeamMembers === 'string') {
        teamMembers = JSON.parse(ibcApplication.protocolTeamMembers);
      } else if (Array.isArray(ibcApplication?.protocolTeamMembers)) {
        teamMembers = ibcApplication.protocolTeamMembers;
      }
    } catch (error) {
      console.error('Error parsing team members:', error);
      teamMembers = [];
    }
    
    const ids = teamMembers.map((member: any) => member.scientistId).filter(Boolean);
    return {
      teamMemberIds: ids,
      teamMembersData: teamMembers
    };
  })();

  // Fetch all team member scientist data
  const { data: teamMemberScientists = [], isLoading: teamMembersLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists', 'bulk', teamMemberIds],
    queryFn: async () => {
      if (teamMemberIds.length === 0) return [];
      
      const scientists = await Promise.all(
        teamMemberIds.map(async (scientistId: number) => {
          const response = await fetch(`/api/scientists/${scientistId}`);
          if (!response.ok) return null;
          return response.json();
        })
      );
      
      return scientists.filter(Boolean);
    },
    enabled: teamMemberIds.length > 0,
  });
  
  // Get the number of publications linked to the first research activity (if any)
  const firstActivityId = associatedActivities?.[0]?.id;
  const { count: publicationCount } = usePublicationCount(firstActivityId);

  if (ibcApplicationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ibc")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ibcApplication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ibc")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">IBC Application Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The IBC application you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/ibc")}>
                Return to IBC Applications List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function for status badge - supports IRB-style workflow progression
  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Draft</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      case 'vetted':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Vetted</Badge>;
      case 'under review':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Under Review</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      // Legacy status mappings for backwards compatibility
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Under Review</Badge>;
      case 'review':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Under Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  // Helper function for status descriptions
  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Application is saved as a draft and can be edited before submission';
      case 'submitted':
        return 'Application has been submitted and is awaiting initial review';
      case 'vetted':
        return 'Application has passed initial vetting and is being prepared for committee review';
      case 'under review':
        return 'Application is currently under review by the Institutional Biosafety Committee';
      case 'active':
        return `Application is approved and active${ibcApplication.approvalDate ? ` since ${format(new Date(ibcApplication.approvalDate), 'PPP')}` : ''}`;
      case 'expired':
        return 'Application approval has expired and requires renewal';
      case 'rejected':
        return 'Application has been rejected by the Institutional Biosafety Committee';
      // Legacy status mappings for backwards compatibility
      case 'approved':
        return `Application is approved and active${ibcApplication.approvalDate ? ` since ${format(new Date(ibcApplication.approvalDate), 'PPP')}` : ''}`;
      case 'pending':
        return 'Application is awaiting review by the Institutional Biosafety Committee';
      case 'review':
        return 'Application is currently under review by the Institutional Biosafety Committee';
      default:
        return 'Application status is being processed';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ibc")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{ibcApplication.title}</h1>
        </div>
        {ibcApplication.status?.toLowerCase() === 'draft' && (
          <Button 
            className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
            onClick={() => navigate(`/ibc-applications/${ibcApplication.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>IBC Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{ibcApplication.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                    {ibcApplication.ibcNumber}
                  </Badge>
                  {getStatusBadge(ibcApplication.status)}
                </div>
              </div>

              <div className="mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Related Research Activity</h3>
                  <div className="flex items-center gap-1">
                    <Beaker className="h-3 w-3" />
                    <span>
                      {activitiesLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : associatedActivities && associatedActivities.length > 0 ? (
                        <span className="text-blue-600">
                          {associatedActivities.length} SDR{associatedActivities.length === 1 ? '' : 's'} linked
                        </span>
                      ) : 'No SDRs linked'}
                    </span>
                  </div>
                </div>
              </div>



              {ibcApplication.materialAndMethods && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{ibcApplication.materialAndMethods}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Submission Date</h3>
                  <p className="mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {ibcApplication.submissionDate ? format(new Date(ibcApplication.submissionDate), 'PPP') : 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Approval Date</h3>
                  <p className="mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {ibcApplication.approvalDate ? format(new Date(ibcApplication.approvalDate), 'PPP') : 'Not yet approved'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Expiration Date</h3>
                  <p className="mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {ibcApplication.expirationDate ? format(new Date(ibcApplication.expirationDate), 'PPP') : 'Not specified'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Biosafety Level</h3>
                  <p className="mt-1">{ibcApplication.biosafetyLevel || 'Not specified'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Risk Group Classification</h3>
                  <p className="mt-1">{ibcApplication.riskGroupClassification || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Cayuse Protocol Number</h3>
                  <p className="mt-1">{ibcApplication.cayuseProtocolNumber || 'Not assigned'}</p>
                </div>
              </div>

              {/* Biological Agents and Materials Section */}
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Biological Materials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500">Biological Agents</h4>
                    <p className="mt-1 text-sm">{
                      ibcApplication.biologicalAgents ? 
                        (Array.isArray(ibcApplication.biologicalAgents) ? 
                          ibcApplication.biologicalAgents.join(', ') : 
                          ibcApplication.biologicalAgents) : 
                        'None specified'
                    }</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500">Chemical Agents</h4>
                    <p className="mt-1 text-sm">{
                      ibcApplication.chemicalAgents ? 
                        (Array.isArray(ibcApplication.chemicalAgents) ? 
                          ibcApplication.chemicalAgents.join(', ') : 
                          ibcApplication.chemicalAgents) : 
                        'None specified'
                    }</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    {ibcApplication.recombinantDNA ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Recombinant DNA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ibcApplication.humanMaterials ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Human Materials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ibcApplication.animalWork ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Animal Work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ibcApplication.fieldWork ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span className="text-sm">Field Work</span>
                  </div>
                </div>
              </div>

              {/* Methods and Procedures Section */}
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Methods and Procedures</h3>
                
                {ibcApplication.materialAndMethods && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Materials and Methods</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.materialAndMethods}</p>
                  </div>
                )}
                
                {ibcApplication.proceduresInvolvingInfectiousAgents && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Procedures Involving Infectious Agents</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.proceduresInvolvingInfectiousAgents}</p>
                  </div>
                )}
                
                {ibcApplication.cellCultureProcedures && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Cell Culture Procedures</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.cellCultureProcedures}</p>
                  </div>
                )}
                
                {ibcApplication.nucleicAcidExtractionMethods && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Nucleic Acid Extraction Methods</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.nucleicAcidExtractionMethods}</p>
                  </div>
                )}
                
                {ibcApplication.animalProcedures && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Animal Procedures</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.animalProcedures}</p>
                  </div>
                )}
              </div>

              {/* Safety and Containment Section */}
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Safety and Containment</h3>
                
                {ibcApplication.containmentProcedures && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Containment Procedures</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.containmentProcedures}</p>
                  </div>
                )}
                
                {ibcApplication.emergencyProcedures && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Emergency Procedures</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.emergencyProcedures}</p>
                  </div>
                )}
                
                {ibcApplication.wasteDisposalPlan && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Waste Disposal Plan</h4>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{ibcApplication.wasteDisposalPlan}</p>
                  </div>
                )}
                
                {ibcApplication.approvedRooms && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-neutral-500">Approved Rooms</h4>
                    <p className="mt-1 text-sm">{
                      Array.isArray(ibcApplication.approvedRooms) ? 
                        ibcApplication.approvedRooms.join(', ') : 
                        ibcApplication.approvedRooms
                    }</p>
                  </div>
                )}
              </div>


            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                {getStatusBadge(ibcApplication.status)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {getStatusDescription(ibcApplication.status)}
              </p>
            </CardContent>
          </Card>

          {/* Timeline & Office Comments */}
          <TimelineComments 
            application={ibcApplication} 
            comments={comments} 
          />

          {/* Associated Research Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Associated Research Activities</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : associatedActivities && associatedActivities.length > 0 ? (
                <div className="space-y-3">
                  {associatedActivities.map((activity) => (
                    <div key={activity.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                         onClick={() => navigate(`/research-activities/${activity.id}`)}>
                      <div className="flex items-start gap-2">
                        <Beaker className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-900 text-sm">{activity.sdrNumber}</span>
                            {activity.status && (
                              <Badge variant="outline" className={`text-xs ${
                                activity.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                activity.status === 'completed' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {activity.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.title}</p>
                          {activity.budgetSource && activity.budgetSource.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {activity.budgetSource.map((source, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  {source}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No research activities linked</p>
              )}
            </CardContent>
          </Card>

          {/* Principal Investigator */}
          <Card>
            <CardHeader>
              <CardTitle>Principal Investigator</CardTitle>
            </CardHeader>
            <CardContent>
              {piLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : principalInvestigator ? (
                <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                     onClick={() => navigate(`/scientists/${principalInvestigator.id}`)}>
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900 text-sm">{principalInvestigator.name}</span>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                          PI
                        </Badge>
                      </div>
                      {principalInvestigator.department && (
                        <p className="text-xs text-gray-600 mt-1">{principalInvestigator.department}</p>
                      )}
                      {principalInvestigator.email && (
                        <p className="text-xs text-blue-600 mt-1">{principalInvestigator.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No principal investigator assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Protocol Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Protocol Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                let teamMembers = [];
                try {
                  if (ibcApplication.protocolTeamMembers && typeof ibcApplication.protocolTeamMembers === 'string') {
                    teamMembers = JSON.parse(ibcApplication.protocolTeamMembers);
                  } else if (Array.isArray(ibcApplication.protocolTeamMembers)) {
                    teamMembers = ibcApplication.protocolTeamMembers;
                  }
                } catch (error) {
                  console.error('Error parsing team members:', error);
                  teamMembers = [];
                }

                if (teamMembersLoading) {
                  return (
                    <div className="space-y-3">
                      {teamMembersData.map((_, index: number) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  );
                }

                if (teamMembersData.length === 0) {
                  return (
                    <p className="text-sm text-gray-500">No team members added</p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {teamMembersData.map((member: any, index: number) => {
                      const scientist = teamMemberScientists.find(s => s.id === member.scientistId);
                      return (
                        <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-blue-900 text-sm">
                                  {scientist?.name || 'Unknown Scientist'}
                                </span>
                                {member.role && (
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                    {member.role === 'team_leader' ? 'Team Leader' :
                                     member.role === 'safety_representative' ? 'Safety Representative' :
                                     'Team Member'}
                                  </Badge>
                                )}
                              </div>
                              {scientist?.email && (
                                <p className="text-xs text-blue-600 mt-1">{scientist.email}</p>
                              )}
                              {scientist?.department && (
                                <p className="text-xs text-gray-600 mt-1">{scientist.department}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-sm" 
                  onClick={() => associatedActivities && associatedActivities.length > 0 && navigate(`/publications?researchActivityId=${associatedActivities[0].id}`)}
                  disabled={!associatedActivities || associatedActivities.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">View Publications</span>
                  {associatedActivities && associatedActivities.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                      {publicationCount}
                    </Badge>
                  )}
                </Button>
                {ibcApplication.status?.toLowerCase() === 'draft' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm" 
                    onClick={() => navigate(`/ibc-applications/${ibcApplication.id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Edit Application</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Status Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {['active', 'approved'].includes(ibcApplication.status.toLowerCase()) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Current Status: {ibcApplication.status}</p>
                    <p className="text-sm text-neutral-500">
                      {getStatusDescription(ibcApplication.status)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}