import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, IbcApplication, Scientist } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, User, Beaker, AlertCircle, CheckCircle2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { usePublicationCount } from "@/hooks/use-publication-count";

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
    enabled: !!id,
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
  
  // Get the number of publications linked to this research activity
  const { count: publicationCount } = usePublicationCount(ibcApplication?.researchActivityId);

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

  // Helper function for status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      case 'review':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
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
        <Button 
          className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
          onClick={() => navigate(`/ibc-applications/${ibcApplication.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Related Research Activity</h3>
                  <div className="flex items-center gap-1">
                    <Beaker className="h-3 w-3" />
                    <span>
                      {researchActivityLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : researchActivity ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600"
                          onClick={() => navigate(`/research-activities/${researchActivity.id}`)}
                        >
                          {researchActivity.title}
                        </Button>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Investigator</h3>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>
                      {piLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : principalInvestigator ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600"
                          onClick={() => navigate(`/scientists/${principalInvestigator.id}`)}
                        >
                          {principalInvestigator.name}
                        </Button>
                      ) : 'Not assigned'}
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

              {/* Research Activities and Personnel Section */}
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Research Activities and Personnel</h3>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-neutral-500">Associated Research Activities (SDRs)</h4>
                  {activitiesLoading ? (
                    <div className="mt-2">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : associatedActivities && associatedActivities.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {associatedActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Beaker className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <span className="font-medium text-blue-900">{activity.sdrNumber}</span>
                            <span className="text-blue-700 ml-2">{activity.title}</span>
                            {activity.status && (
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                activity.status === 'active' ? 'bg-green-100 text-green-800' :
                                activity.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 text-sm text-neutral-600">
                        <span className="font-medium">Coverage:</span> This IBC application covers {associatedActivities.length} research activit{associatedActivities.length === 1 ? 'y' : 'ies'} with shared biosafety protocols and team members.
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-500">No research activities linked</p>
                  )}
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-neutral-500">Research Team Personnel</h4>
                  {principalInvestigator ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <User className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="font-medium text-green-900">Principal Investigator:</span>
                          <span className="text-green-700 ml-2">{principalInvestigator.name}</span>
                          <Badge variant="outline" className="ml-2 rounded-sm bg-green-100 text-green-800 border-green-300">
                            PI
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-neutral-600">
                        <span className="font-medium">Team Members:</span> Additional team members are managed through the associated research activities (SDRs). Each SDR maintains its own team roster with overlapping members sharing this IBC protocol.
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-500">No principal investigator assigned</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => researchActivity && navigate(`/research-activities/${researchActivity.id}`)}
                  disabled={!researchActivity}
                >
                  <Beaker className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">Research Activity</span>
                  {researchActivity && (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => principalInvestigator && navigate(`/scientists/${principalInvestigator.id}`)}
                  disabled={!principalInvestigator}
                >
                  <User className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">Principal Investigator</span>
                  {principalInvestigator && principalInvestigator.staffId ? (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      ID: {principalInvestigator.staffId}
                    </Badge>
                  ) : principalInvestigator && (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                      PI
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => researchActivity && navigate(`/publications?researchActivityId=${researchActivity.id}`)}
                  disabled={!researchActivity}
                >
                  <FileText className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">Publications</span>
                  {researchActivity && (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-green-50 text-green-700 border-green-200">
                      {publicationCount} {publicationCount === 1 ? 'publication' : 'publications'}
                    </Badge>
                  )}
                </Button>
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
                  {ibcApplication.status.toLowerCase() === 'approved' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">Current Status: {ibcApplication.status}</p>
                    <p className="text-sm text-neutral-500">
                      {ibcApplication.status.toLowerCase() === 'approved' 
                        ? `Approved on ${ibcApplication.approvalDate ? format(new Date(ibcApplication.approvalDate), 'PPP') : 'unknown date'}`
                        : 'Awaiting approval from the Institutional Biosafety Committee'
                      }
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