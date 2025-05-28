import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, Publication, Patent } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Book, Layers, ExternalLink, Award, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function PublicationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: publication, isLoading: publicationLoading } = useQuery<Publication>({
    queryKey: ['/api/publications', id],
    queryFn: async () => {
      const response = await fetch(`/api/publications/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch publication');
      }
      return response.json();
    },
  });

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', publication?.researchActivityId],
    queryFn: async () => {
      if (!publication?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${publication.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!publication?.researchActivityId,
  });
  
  // Fetch patents related to the same research activity
  const { data: relatedPatents, isLoading: patentsLoading } = useQuery<Patent[]>({
    queryKey: ['/api/patents', publication?.researchActivityId],
    queryFn: async () => {
      if (!publication?.researchActivityId) return [];
      const response = await fetch('/api/patents');
      if (!response.ok) {
        throw new Error('Failed to fetch patents');
      }
      const patents = await response.json();
      return patents.filter(patent => patent.researchActivityId === publication.researchActivityId);
    },
    enabled: !!publication?.researchActivityId,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  if (publicationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
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

  if (!publication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Publication Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The publication you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/publications")}>
                Return to Publications List
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{publication.title}</h1>
        </div>
        <Button 
          className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
          onClick={() => navigate(`/publications/${publication.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Publication Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{publication.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {researchActivity && (
                    <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                  <Badge className={
                    publication.status === 'published' ? 'bg-green-100 text-green-800' :
                    publication.status === 'in press' ? 'bg-blue-100 text-blue-800' :
                    publication.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {publication.status}
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
                  <h3 className="text-sm font-medium text-neutral-400">Publication Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {publication.publicationDate 
                        ? format(new Date(publication.publicationDate), 'MMM d, yyyy') 
                        : 'Not published yet'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Publication Type</h3>
                  <div className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    <span>{publication.publicationType || 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Authors</h3>
                  <div className="flex items-center gap-1">
                    <span>{publication.authors}</span>
                  </div>
                </div>
              </div>

              {publication.journal && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Journal</h3>
                  <p className="mt-1">
                    {publication.journal}
                    {publication.volume && (
                      <span>, Vol. {publication.volume}</span>
                    )}
                    {publication.issue && (
                      <span>, No. {publication.issue}</span>
                    )}
                    {publication.pages && (
                      <span>, pp. {publication.pages}</span>
                    )}
                  </p>
                </div>
              )}
              
              {publication.doi && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">DOI</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={`https://doi.org/${publication.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {publication.doi}
                    </a>
                  </div>
                </div>
              )}
              
              {publication.abstract && (
                <div className="mt-6">
                  <h3 className="text-md font-medium border-b pb-2">Abstract</h3>
                  <p className="mt-2">{publication.abstract}</p>
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
                {relatedPatents && relatedPatents.length > 0 ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => {
                      // Use a different approach - open in new tab first while we debug
                      const patentId = relatedPatents[0]?.id;
                      if (patentId) {
                        // Navigate directly to the patent detail page with a delay
                        setTimeout(() => {
                          window.location.href = `/patents/${patentId}`;
                        }, 100);
                      }
                    }}
                  >
                    <Award className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Related Patent</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-amber-50 text-amber-700 border-amber-200">
                      {relatedPatents[0]?.patentNumber || 'Pending'}
                    </Badge>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => researchActivity && navigate(`/patents?researchActivityId=${researchActivity?.id}`)}
                    disabled={!researchActivity}
                  >
                    <Award className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Related Patents</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-gray-50 text-gray-700 border-gray-200">
                      0
                    </Badge>
                  </Button>
                )}
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