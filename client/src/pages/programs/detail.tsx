import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Program } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ProgramDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ['/api/programs', id],
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch program');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
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

  if (!program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Program Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The program you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/programs")}>
                Return to Programs List
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">{program.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{program.name}</h2>
                <div className="text-neutral-400 flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">{program.programId}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Category</h3>
                  <p>{program.category}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Status</h3>
                  <Badge variant={program.status === 'active' ? 'success' : program.status === 'completed' ? 'default' : 'secondary'}>
                    {program.status}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Start Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.startDate ? format(new Date(program.startDate), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">End Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.endDate ? format(new Date(program.endDate), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {program.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{program.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">Projects list to be added.</p>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/projects")}>
                <Layers className="h-4 w-4 mr-2" /> View Projects
              </Button>
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