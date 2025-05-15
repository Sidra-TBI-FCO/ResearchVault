import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, ProjectGroup, Scientist } from "@shared/schema";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Layers, 
  Users, 
  BookText, 
  Award, 
  ClipboardList,
  Beaker,
  File 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ResearchActivityDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: project, isLoading: projectLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
  });

  const { data: projectGroup, isLoading: projectGroupLoading } = useQuery<ProjectGroup>({
    queryKey: ['/api/project-groups', project?.projectGroupId],
    queryFn: async () => {
      if (!project?.projectGroupId) return null;
      const response = await fetch(`/api/project-groups/${project.projectGroupId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project group');
      }
      return response.json();
    },
    enabled: !!project?.projectGroupId,
  });

  const { data: members, isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ['/api/projects', id, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch project members');
      }
      return response.json();
    },
  });

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
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

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Research Activity Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The research activity you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/research-activities")}>
                Return to Research Activities List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'default';
      case 'completed':
      case 'published':
        return 'secondary';
      case 'pending':
      case 'in review':
        return 'outline';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">{project.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Research Activity Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{project.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                    {project.sdrNumber}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(project.status || '')}>
                    {project.status || 'Unknown Status'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Project Group</h3>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>
                      {projectGroupLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : projectGroup ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600"
                          onClick={() => navigate(`/projects/${projectGroup.id}`)}
                        >
                          {projectGroup.name}
                        </Button>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Status</h3>
                  <Badge variant={getStatusBadgeVariant(project.status || '')}>
                    {project.status || 'Unknown Status'}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Start Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">End Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Created Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{project.createdAt ? format(new Date(project.createdAt), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Last Updated</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{project.updatedAt ? format(new Date(project.updatedAt), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {project.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{project.description}</p>
                </div>
              )}

              {project.objectives && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Objectives</h3>
                  <p className="mt-1">{project.objectives}</p>
                </div>
              )}
            </div>

            <Accordion type="single" collapsible className="mt-6">
              <AccordionItem value="methodology">
                <AccordionTrigger>Methodology</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    {project.methodology ? (
                      <p>{project.methodology}</p>
                    ) : (
                      <p className="text-neutral-400">No methodology information available.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="impact">
                <AccordionTrigger>Impact</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    {project.impact ? (
                      <p>{project.impact}</p>
                    ) : (
                      <p className="text-neutral-400">No impact information available.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="budget">
                <AccordionTrigger>Budget Information</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    {project.budget ? (
                      <p>{project.budget}</p>
                    ) : (
                      <p className="text-neutral-400">No budget information available.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.scientistId} 
                      className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => navigate(`/scientists/${member.scientistId}`)}
                    >
                      <div>
                        <p className="font-medium">{member.scientist?.name}</p>
                        <p className="text-sm text-gray-500">{member.role || 'Team Member'}</p>
                      </div>
                      <Badge variant="outline">{member.scientist?.title || 'Researcher'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-400">No team members assigned to this research activity.</p>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => navigate(`/projects/${id}/members/add`)}
              >
                <Users className="h-4 w-4 mr-2" /> Add Team Member
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documents & Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Data Management Plan</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/data-management-plans/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="font-medium">IRB Applications</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/irb-applications/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="font-medium">IBC Applications</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/ibc-applications/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-medium">Research Contracts</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/research-contracts/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <BookText className="h-4 w-4 text-pink-500" />
                    <div>
                      <p className="font-medium">Publications</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/publications/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium">Patents</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/patents/create?researchActivityId=${id}`)}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}