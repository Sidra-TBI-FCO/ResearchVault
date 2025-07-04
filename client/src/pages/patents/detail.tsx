import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, Patent } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Award, Layers, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { usePublicationCount } from "@/hooks/use-publication-count";
import { useEffect } from "react";

export default function PatentDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: patent, isLoading: patentLoading } = useQuery<Patent>({
    queryKey: ['/api/patents', id],
    queryFn: async () => {
      console.log("Fetching patent with ID:", id);
      const response = await fetch(`/api/patents/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patent');
      }
      const data = await response.json();
      console.log("Patent data received:", data);
      return data;
    },
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0, // Always refetch
  });
  
  // Check if we're coming from another page that might have lost our context
  useEffect(() => {
    // Force a refresh if we're here with ID but no data after 1 second
    const timer = setTimeout(() => {
      if (id && !patent && !patentLoading) {
        window.location.reload();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [id, patent, patentLoading]);

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', patent?.researchActivityId],
    queryFn: async () => {
      if (!patent?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${patent.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!patent?.researchActivityId,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  // Get the number of publications linked to this research activity
  const { count: publicationCount } = usePublicationCount(patent?.researchActivityId || undefined);

  if (patentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patents")}>
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

  // If we're still loading, don't show a "not found" message
  if (!patent && !patentLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patents")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Patent Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The patent you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/patents")}>
                Return to Patents List
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/patents")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{patent.title}</h1>
        </div>
        <Button 
          className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
          onClick={() => navigate(`/patents/${patent.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Patent Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{patent.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {researchActivity && (
                    <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                  <Badge className={
                    patent.status === 'granted' ? 'bg-green-100 text-green-800' :
                    patent.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    patent.status === 'filed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {patent.status}
                  </Badge>
                </div>
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
                  <h3 className="text-sm font-medium text-neutral-400">Inventors</h3>
                  <div className="flex items-center gap-1">
                    <span>{patent.inventors}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Filing Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {patent.filingDate 
                        ? format(new Date(patent.filingDate), 'MMM d, yyyy') 
                        : 'Not specified'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Grant Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {patent.grantDate 
                        ? format(new Date(patent.grantDate), 'MMM d, yyyy') 
                        : 'Not granted yet'}
                    </span>
                  </div>
                </div>
                
                {patent.patentNumber && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Patent Number</h3>
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      <span>{patent.patentNumber}</span>
                    </div>
                  </div>
                )}
              </div>

              {patent.description && (
                <div className="mt-6">
                  <h3 className="text-md font-medium border-b pb-2">Description</h3>
                  <p className="mt-2">{patent.description}</p>
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