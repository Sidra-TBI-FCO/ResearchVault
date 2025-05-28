import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table as TableIcon, FilePlus, Search, MoreHorizontal, Users } from "lucide-react";

interface Program {
  id: number;
  programId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Scientist {
  id: number;
  name: string;
  profileImageInitials?: string;
}

interface Project {
  id: number;
  projectId: string;
  programId: number;
  name: string;
  description: string | null;
  leadScientistId: number | null;
  createdAt: string;
  updatedAt: string;
  
  // Related entities
  program?: Program;
  leadScientist?: Scientist;
}

interface ResearchActivity {
  id: number;
  sdrNumber: string;
  projectId: number | null;
  title: string;
  shortTitle: string | null;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  leadPIId: number | null;
  createdAt: string;
  updatedAt: string;
  
  // Related entities
  project?: Project;
  leadPI?: Scientist;
}

export default function ResearchActivitiesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [, navigate] = useLocation();

  const { data: researchActivities, isLoading: isLoadingActivities } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: scientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  // Enhance research activities with related data
  const enhancedActivities = researchActivities?.map(activity => {
    const project = projects?.find(p => p.id === activity.projectId);
    const leadPI = activity.leadPIId ? 
      scientists?.find(s => s.id === activity.leadPIId) : undefined;
    return {
      ...activity,
      project,
      leadPI
    };
  });

  const filteredActivities = enhancedActivities?.filter(activity => {
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      activity.sdrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.project?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = projectFilter === "all" || (activity.projectId && activity.projectId === parseInt(projectFilter));
    
    return matchesSearch && matchesProject;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">Research Activities (SDR)</h1>
        <div className="bg-red-500 text-white p-2">TEST BUTTON</div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>All Research Activities</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search research activities..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select 
                value={projectFilter}
                onValueChange={setProjectFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-64" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SDR Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Lead PI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities?.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <TableIcon className="h-4 w-4 text-primary-500" />
                        <span>{activity.sdrNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="cursor-pointer hover:text-primary-500 transition-colors"
                        onClick={() => navigate(`/research-activities/${activity.id}`)}
                      >
                        {activity.title}
                      </div>
                      {activity.description && (
                        <div className="text-sm text-neutral-200 mt-1 line-clamp-1">
                          {activity.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.project ? (
                        <div 
                          className="text-sm hover:text-primary-500 transition-colors cursor-pointer"
                          onClick={() => navigate(`/projects/${activity.project.id}`)}
                        >
                          {activity.project.name}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-200">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.leadPI ? (
                        <div className="flex items-center">
                          <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                            {activity.leadPI.profileImageInitials || activity.leadPI.name.substring(0, 2)}
                          </div>
                          <span>{activity.leadPI.name}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-200">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${activity.status === 'active' ? 'bg-green-100 text-green-800' : 
                          activity.status === 'planning' ? 'bg-blue-100 text-blue-800' : 
                          activity.status === 'completed' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'}`
                      }>
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1).replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/research-activities/${activity.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/research-activities/${activity.id}/edit`}>
                              Edit Activity
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingActivities && (!filteredActivities || filteredActivities.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-200">
                      {researchActivities && researchActivities.length > 0 
                        ? "No research activities matching your search criteria."
                        : "No research activities yet. Create your first research activity!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}