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

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', ibcApplication?.researchActivityId],
    queryFn: async () => {
      if (!ibcApplication?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${ibcApplication.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!ibcApplication?.researchActivityId,
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

              {ibcApplication.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{ibcApplication.description}</p>
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
                  <h3 className="text-sm font-medium text-neutral-400">Biological Agents</h3>
                  <p className="mt-1">{ibcApplication.biologicalAgents || 'None specified'}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Biosafety Level</h3>
                <p className="mt-2">{ibcApplication.biosafetyLevel || 'Not specified'}</p>
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">Recombinant DNA</h3>
                <p className="mt-2">{ibcApplication.recombinantDna ? 'Yes' : 'No'}</p>
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium border-b pb-2">People Involved</h3>
                {ibcApplication.peopleInvolved && ibcApplication.peopleInvolved.length > 0 ? (
                  <ul className="mt-2 list-disc list-inside">
                    {/* Map through peopleInvolved and display names. In a real app, you'd fetch user data */}
                    {ibcApplication.peopleInvolved.map((personId, index) => (
                      <li key={index}>Person ID: {personId}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">No additional people involved</p>
                )}
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