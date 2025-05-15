import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, DataManagementPlan } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Database, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function DataManagementPlanDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: plan, isLoading: planLoading } = useQuery<DataManagementPlan>({
    queryKey: ['/api/data-management-plans', id],
    queryFn: async () => {
      const response = await fetch(`/api/data-management-plans/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data management plan');
      }
      return response.json();
    },
  });

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', plan?.researchActivityId],
    queryFn: async () => {
      if (!plan?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${plan.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!plan?.researchActivityId,
  });

  if (planLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/data-management-plans")}>
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

  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/data-management-plans")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Data Management Plan Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The data management plan you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/data-management-plans")}>
                Return to Data Management Plans List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/data-management-plans")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">{plan.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data Management Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{plan.title}</h2>
                {researchActivity && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Related Research Activity</h3>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
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
                  <h3 className="text-sm font-medium text-neutral-400">Created Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{plan.createdAt ? format(new Date(plan.createdAt), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Last Updated</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{plan.updatedAt ? format(new Date(plan.updatedAt), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {plan.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{plan.description}</p>
                </div>
              )}
              
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-md font-medium border-b pb-2">Data Collection Methods</h3>
                  <p className="mt-2">{plan.dataCollectionMethods || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium border-b pb-2">Data Storage Plan</h3>
                  <p className="mt-2">{plan.dataStoragePlan || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium border-b pb-2">Data Sharing Plan</h3>
                  <p className="mt-2">{plan.dataSharingPlan || 'Not specified'}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium border-b pb-2">Retention Period</h3>
                  <p className="mt-2">{plan.retentionPeriod || 'Not specified'}</p>
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
                  <Layers className="h-4 w-4 mr-2" /> Research Activity
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => researchActivity && navigate(`/research-activities/${researchActivity.id}/publications`)}
                  disabled={!researchActivity}
                >
                  <FileText className="h-4 w-4 mr-2" /> Publications
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">No documents available.</p>
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