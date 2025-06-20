import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, IrbApplication, Scientist, DataManagementPlan } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Layers, Users, ClipboardCheck, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { usePublicationCount } from "@/hooks/use-publication-count";
import StatusActions from "@/components/irb/StatusActions";

export default function IrbApplicationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: irbApplication, isLoading: irbApplicationLoading } = useQuery<IrbApplication>({
    queryKey: ['/api/irb-applications', id],
    queryFn: async () => {
      const response = await fetch(`/api/irb-applications/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IRB application');
      }
      return response.json();
    },
  });

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', irbApplication?.researchActivityId],
    queryFn: async () => {
      if (!irbApplication?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${irbApplication.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!irbApplication?.researchActivityId,
  });

  const { data: principalInvestigator, isLoading: principalInvestigatorLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', irbApplication?.principalInvestigatorId],
    queryFn: async () => {
      if (!irbApplication?.principalInvestigatorId) return null;
      const response = await fetch(`/api/scientists/${irbApplication.principalInvestigatorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch principal investigator');
      }
      return response.json();
    },
    enabled: !!irbApplication?.principalInvestigatorId,
  });
  
  // Get the number of publications linked to this research activity
  const { count: publicationCount } = usePublicationCount(irbApplication?.researchActivityId);
  
  // Get the data management plan for this research activity
  const { data: dataManagementPlan, isLoading: dmpLoading } = useQuery<DataManagementPlan>({
    queryKey: ['/api/data-management-plans', irbApplication?.researchActivityId],
    queryFn: async () => {
      if (!irbApplication?.researchActivityId) return null;
      const response = await fetch(`/api/data-management-plans?researchActivityId=${irbApplication.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data management plan');
      }
      const plans = await response.json();
      return plans.length > 0 ? plans[0] : null;
    },
    enabled: !!irbApplication?.researchActivityId,
  });

  if (irbApplicationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/irb-applications")}>
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

  if (!irbApplication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/irb")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">IRB Application Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The IRB application you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/irb")}>
                Return to IRB Applications List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/irb")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{irbApplication.title}</h1>
        </div>
        <div className="flex gap-2">
          {(irbApplication.workflowStatus === 'draft' || irbApplication.workflowStatus === 'revisions_requested') && (
            <Button 
              onClick={() => navigate(`/irb/${id}/assembly`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Protocol Assembly
            </Button>
          )}
          <StatusActions 
            applicationId={id}
            currentStatus={irbApplication.workflowStatus || 'draft'}
          />
          <Button 
            variant="outline"
            onClick={() => navigate(`/irb-applications/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>IRB Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{irbApplication.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                    {irbApplication.irbNumber}
                  </Badge>
                  {researchActivity && (
                    <Badge variant="outline" className="rounded-sm bg-green-50 text-green-700 border-green-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                  <Badge className={
                    irbApplication.workflowStatus === 'approved' ? 'bg-green-100 text-green-800' :
                    irbApplication.workflowStatus === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    irbApplication.workflowStatus === 'under_review' ? 'bg-blue-100 text-blue-800' :
                    irbApplication.workflowStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                    irbApplication.workflowStatus === 'revisions_requested' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {irbApplication.workflowStatus === 'revisions_requested' ? 'revisions requested' : 
                     (irbApplication.workflowStatus || 'draft').replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Related Research Activity</h3>
                  <div className="flex items-start gap-1 mt-1">
                    <Layers className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="break-words">
                      {researchActivityLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : researchActivity ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600 text-left whitespace-normal"
                          onClick={() => navigate(`/research-activities/${researchActivity.id}`)}
                        >
                          {researchActivity.title}
                        </Button>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Investigator</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {principalInvestigatorLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : principalInvestigator ? (
                        principalInvestigator.name
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Submission Date</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {irbApplication.submissionDate 
                        ? format(new Date(irbApplication.submissionDate), 'MMM d, yyyy') 
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Initial Approval Date</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {irbApplication.initialApprovalDate 
                        ? format(new Date(irbApplication.initialApprovalDate), 'MMM d, yyyy') 
                        : 'Not approved yet'}
                    </span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Expiration Date</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {irbApplication.expirationDate 
                        ? format(new Date(irbApplication.expirationDate), 'MMM d, yyyy') 
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Protocol Type</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <ClipboardCheck className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{irbApplication.protocolType || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">IRB Net Number</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="truncate">{irbApplication.irbNetNumber || 'Not specified'}</span>
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-neutral-400">Interventional</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="truncate">{irbApplication.isInterventional ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {irbApplication.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{irbApplication.description}</p>
                </div>
              )}
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
                  <Layers className="h-4 w-4 mr-2" /> 
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
                  <Users className="h-4 w-4 mr-2" /> 
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
                  onClick={() => {
                    if (dataManagementPlan) {
                      navigate(`/data-management-plans/${dataManagementPlan.id}`);
                    } else if (researchActivity) {
                      navigate(`/data-management-plans?researchActivityId=${researchActivity.id}`);
                    }
                  }}
                  disabled={!researchActivity}
                >
                  <FileText className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">Data Management Plan</span>
                  {dataManagementPlan ? (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-teal-50 text-teal-700 border-teal-200">
                      {dataManagementPlan.dmpNumber}
                    </Badge>
                  ) : researchActivity ? (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-gray-50 text-gray-700 border-gray-200">
                      None
                    </Badge>
                  ) : null}
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
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {irbApplication.documents && irbApplication.documents.protocolSummary ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-neutral-400" />
                      <span>{irbApplication.documents.protocolSummary}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400">No documents available.</p>
              )}
              <Button variant="outline" className="w-full mt-4" disabled>
                <FileText className="h-4 w-4 mr-2" /> Add Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}