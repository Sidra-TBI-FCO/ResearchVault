import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ResearchActivity, Scientist } from "@shared/schema";
import { Users, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Teams() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch all research activities
  const { data: researchActivities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['/api/research-activities'],
    queryFn: async () => {
      const response = await fetch('/api/research-activities');
      if (!response.ok) {
        throw new Error('Failed to fetch research activities');
      }
      return response.json();
    }
  });

  // Fetch all scientists (staff and PIs)
  const { data: scientists, isLoading: isLoadingScientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: async () => {
      const response = await fetch('/api/scientists');
      if (!response.ok) {
        throw new Error('Failed to fetch scientists');
      }
      return response.json();
    }
  });

  // Get the number of team members for each research activity
  const getTeamMemberCount = (activityId: number) => {
    // This will be populated once we add the API endpoint
    return "...";
  };

  // Navigate to the team detail page
  const handleViewTeam = (activityId: number) => {
    navigate(`/teams/${activityId}`);
  };

  if (isLoadingActivities || isLoadingScientists) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Research Teams</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <span>Research Teams</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>List of research activities and their teams</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>SDR Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {researchActivities?.map((activity: ResearchActivity) => {
                const leadPI = scientists?.find(s => s.id === activity.leadPIId);
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {activity.sdrNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.title}</TableCell>
                    <TableCell>
                      <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{leadPI?.name || 'Not assigned'}</TableCell>
                    <TableCell>{getTeamMemberCount(activity.id)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleViewTeam(activity.id)}
                      >
                        View Team
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}