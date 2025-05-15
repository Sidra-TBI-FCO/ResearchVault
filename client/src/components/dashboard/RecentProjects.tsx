import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { EnhancedProject } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentProjectsProps {
  limit?: number;
}

export default function RecentProjects({ limit = 5 }: RecentProjectsProps) {
  const { data: projects, isLoading, error } = useQuery<EnhancedProject[]>({
    queryKey: ['/api/dashboard/recent-projects', { limit }],
  });

  const statusColors = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    planning: "bg-blue-100 text-blue-600",
    completed: "bg-gray-100 text-gray-600",
    on_hold: "bg-red-100 text-red-600"
  };

  // Format date to "X days/weeks ago"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-500">Error loading recent projects</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Recent Projects</h2>
          <Link href="/projects">
            <Button variant="link" className="text-primary-500 px-0">View All</Button>
          </Link>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <Skeleton className="h-6 w-72" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <table className="min-w-full">
              <thead>
                <tr className="bg-neutral-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Lead Scientist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Last Update</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-300 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {projects?.map((project) => (
                  <tr key={project.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/projects/${project.id}`}>
                        <a className="font-medium text-gray-900 hover:text-primary-600">{project.title}</a>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {project.leadScientist ? (
                          <>
                            <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                              {project.leadScientist.profileImageInitials}
                            </div>
                            <span>{project.leadScientist.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[project.status as keyof typeof statusColors] || "bg-gray-100 text-gray-600"}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-200">
                      {formatDate(project.updatedAt.toString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button variant="ghost" size="icon" className="text-neutral-300 hover:text-primary-500">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled className="text-neutral-300">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-neutral-200">Page 1 of 1</span>
              <Button variant="outline" size="sm" className="text-primary-500">
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
