import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, CheckCircle, BookOpen, UserPlus,
  Clock, Calendar, Bell, BriefcaseBusiness
} from "lucide-react";
import { Activity } from "@/lib/types";

// Mock activities since API isn't implemented for activities
const mockActivities: Activity[] = [
  {
    id: 1,
    type: 'irb_submission',
    title: "IRB Application submitted",
    description: "#IRB-2023-045",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    entity: { id: 1, type: 'irb_application', title: 'IRB-2023-045' },
    user: { id: 2, name: 'Dr. Maria Rodriguez', profileImageInitials: 'MR' }
  },
  {
    id: 2,
    type: 'project_approval',
    title: "Project approved",
    description: "Novel Immunotherapy Approaches",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    entity: { id: 2, type: 'project', title: 'Novel Immunotherapy Approaches' },
    user: { id: 0, name: 'Research Committee' }
  },
  {
    id: 3,
    type: 'publication_added',
    title: "New publication added",
    description: "CRISPR-Cas9 Efficiency in Human Cell Lines",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    entity: { id: 1, type: 'publication', title: 'CRISPR-Cas9 Efficiency in Human Cell Lines' },
    user: { id: 1, name: 'Jane Doe, Ph.D.', profileImageInitials: 'JD' }
  },
  {
    id: 4,
    type: 'staff_added',
    title: "New staff member added to team",
    description: "Emily Wilson, Ph.D.",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    entity: { id: 5, type: 'scientist', title: 'Emily Wilson, Ph.D.' },
    user: { id: 0, name: 'System Admin' }
  }
];

export default function RecentActivity() {
  // In a real implementation, this would fetch from an API
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      // Simulating API call since the endpoint isn't implemented
      return new Promise((resolve) => setTimeout(() => resolve(mockActivities), 500));
    }
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'irb_submission':
      case 'ibc_submission':
        return <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-500">
          <FileText className="h-5 w-5" />
        </div>;
      case 'project_approval':
        return <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-500">
          <CheckCircle className="h-5 w-5" />
        </div>;
      case 'publication_added':
        return <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
          <BookOpen className="h-5 w-5" />
        </div>;
      case 'staff_added':
        return <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
          <UserPlus className="h-5 w-5" />
        </div>;
      default:
        return <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <Bell className="h-5 w-5" />
        </div>;
    }
  };

  const formatDate = (date: Date | string) => {
    const activityDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Format time
    const hours = activityDate.getHours();
    const minutes = activityDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;
    
    if (diffHrs < 24) {
      return `Today, ${timeString}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${timeString}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      };
      return activityDate.toLocaleDateString('en-US', options);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-lg">Recent Activity</h2>
            <Button variant="link" className="text-primary-500 px-0">View All</Button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg">Recent Activity</h2>
          <Button variant="link" className="text-primary-500 px-0">View All</Button>
        </div>
      </div>
      <div className="p-6 divide-y divide-neutral-100">
        {activities?.map((activity) => (
          <div key={activity.id} className="py-4 flex">
            <div className="mr-4 flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            <div>
              <p className="font-medium">
                {activity.title}
                {activity.description && (
                  <span className="font-normal text-neutral-200"> {activity.description}</span>
                )}
              </p>
              <p className="text-sm text-neutral-200">By {activity.user?.name}</p>
              <p className="text-xs text-neutral-200 mt-1">{formatDate(activity.date)}</p>
            </div>
          </div>
        ))}
        
        <div className="pt-4 text-center">
          <Button variant="link" className="text-primary-500">Load More</Button>
        </div>
      </div>
    </div>
  );
}
