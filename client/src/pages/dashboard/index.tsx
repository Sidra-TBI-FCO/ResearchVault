import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentProjects from "@/components/dashboard/RecentProjects";
import RecentActivity from "@/components/dashboard/RecentActivity";
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines";
import QuickLinks from "@/components/dashboard/QuickLinks";
import { DashboardStats } from "@/lib/types";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">Dashboard</h1>
        <div className="flex space-x-3">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Link href="/research-activities/create">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> New Research Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-2">
        <QuickLinks />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Active Projects" 
          value={statsLoading ? 0 : stats?.activeProjects || 0} 
          change={8.3} 
          type="projects" 
        />
        <StatsCard 
          title="Publications" 
          value={statsLoading ? 0 : stats?.publications || 0} 
          change={12.1} 
          type="publications" 
        />
        <StatsCard 
          title="Patents" 
          value={statsLoading ? 0 : stats?.patents || 0} 
          change={0} 
          type="patents" 
        />
        <StatsCard 
          title="Pending Applications" 
          value={statsLoading ? 0 : stats?.pendingApplications || 0} 
          change={-3.2} 
          type="applications" 
        />
      </div>

      {/* Projects & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <RecentProjects limit={4} />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity />
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <UpcomingDeadlines />
      </div>
    </div>
  );
}
