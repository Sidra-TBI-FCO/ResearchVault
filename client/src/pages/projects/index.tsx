import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { FlaskConical, FileText, Search, MoreHorizontal, Users } from "lucide-react";

interface ResearchActivity {
  id: number;
  sdrNumber: string;
  projectGroupId: number;
  title: string;
  shortTitle: string | null;
  description: string | null;
  status: string;
  startDate: string | null;
  leadPiId: number;
  budgetSource: string | null;
  sidraBranch: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectGroup {
  id: number;
  projectGroupId: string;
  programId: number;
  name: string;
  description: string | null;
  leadScientistId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Scientist {
  id: number;
  name: string;
  profileImageInitials?: string;
}

export default function ResearchActivitiesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const { data: researchActivities, isLoading: isLoadingResearchActivities } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/projects'],
  });

  const { data: projectGroups } = useQuery<ProjectGroup[]>({
    queryKey: ['/api/project-groups'],
  });

  const { data: scientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  // Enhance research activities with related data
  const enhancedResearchActivities = researchActivities?.map(activity => {
    const projectGroup = projectGroups?.find(p => p.id === activity.projectGroupId);
    const leadPI = scientists?.find(s => s.id === activity.leadPiId);
    return {
      ...activity,
      projectGroup,
      leadPI
    };
  });

  const filteredResearchActivities = enhancedResearchActivities?.filter(activity => {
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      activity.sdrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.projectGroup?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProject = projectFilter === "all" || activity.projectGroupId === parseInt(projectFilter);
    
    return matchesSearch && matchesProject;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">Research Activities (SDR)</h1>
        <Link href="/research-activities/create">
          <Button className="bg-primary-500 text-white">
            <FileText className="h-4 w-4 mr-1" /> New Research Activity
          </Button>
        </Link>
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
                  {projectGroups?.map(project => (
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
          {isLoadingResearchActivities ? (
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
                  <TableHead>Status</TableHead>
                  <TableHead>Lead PI</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResearchActivities?.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FlaskConical className="h-4 w-4 text-primary-500" />
                        <span>{activity.sdrNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/projects/${activity.id}`}
                        className="hover:text-primary-500 transition-colors"
                      >
                        {activity.title}
                      </Link>
                      {activity.shortTitle && (
                        <div className="text-sm text-neutral-200 mt-1">
                          {activity.shortTitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.projectGroup ? (
                        <Link 
                          href={`/project-groups/${activity.projectGroup.id}`}
                          className="text-sm hover:text-primary-500 transition-colors"
                        >
                          {activity.projectGroup.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-neutral-200">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        activity.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : activity.status === 'planning'
                          ? 'bg-blue-100 text-blue-800'
                          : activity.status === 'completed'
                          ? 'bg-purple-100 text-purple-800'
                          : activity.status === 'suspended'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {activity.leadPI ? (
                        <Link
                          href={`/scientists/${activity.leadPI.id}`}
                          className="flex items-center hover:text-primary-500 transition-colors"
                        >
                          <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                            {activity.leadPI.profileImageInitials || activity.leadPI.name.substring(0, 2)}
                          </div>
                          <span>{activity.leadPI.name}</span>
                        </Link>
                      ) : (
                        <span className="text-neutral-200">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoadingResearchActivities && (!filteredResearchActivities || filteredResearchActivities.length === 0) && (
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