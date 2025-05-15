import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Program, ProjectGroup } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Layers, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from "date-fns";

export default function ProgramDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: program, isLoading: programLoading } = useQuery<Program>({
    queryKey: ['/api/programs', id],
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch program');
      }
      return response.json();
    },
  });
  
  const { data: projectGroups, isLoading: projectsLoading } = useQuery<ProjectGroup[]>({
    queryKey: ['/api/programs', id, 'projects'],
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}/projects`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    },
    enabled: !!program,
  });

  if (programLoading) {
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
                  <h3 className="text-sm font-medium text-neutral-400">Added Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.createdAt ? format(new Date(program.createdAt), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Last Updated</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{program.updatedAt ? format(new Date(program.updatedAt), 'MMM d, yyyy') : 'Not specified'}</span>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Projects</CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate("/project-groups/create")}>
                <Plus className="h-4 w-4 mr-2" /> Add Project
              </Button>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : projectGroups && projectGroups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectGroups.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Badge variant="outline">{project.projectGroupId}</Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/project-groups/${project.id}`} className="text-primary hover:underline font-medium">
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-sm truncate">
                          {project.description || "No description available"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <p className="text-neutral-400 mb-4">No projects have been added to this program yet.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/project-groups/create")}>
                    <Plus className="h-4 w-4 mr-2" /> Add Project
                  </Button>
                </div>
              )}
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