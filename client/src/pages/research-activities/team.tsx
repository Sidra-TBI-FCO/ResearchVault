import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TeamDetail from "@/pages/teams/detail";

export default function ResearchActivityTeam() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  // Fetch research activity to verify it exists
  const { data: activity, isLoading, error } = useQuery({
    queryKey: ['/api/research-activities', id],
    enabled: !!id && !isNaN(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/research-activities/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/research-activities")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Research Activity Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8 flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-medium mb-2">Research Activity Not Found</h2>
            <p className="text-neutral-500 text-center mb-4">
              The research activity you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate("/research-activities")}>
              Return to Research Activities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the team management UI with the research activity ID
  return <TeamDetail researchActivityId={id} />;
}