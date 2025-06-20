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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Clock, Eye, Send, CheckCircle, XCircle, 
  FileText, Calendar, User, AlertCircle, Settings
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { IrbApplication } from "@shared/schema";

interface EnhancedIrbApplication extends IrbApplication {
  researchActivity?: {
    id: number;
    sdrNumber: string;
    title: string;
  };
  principalInvestigator?: {
    id: number;
    name: string;
    profileImageInitials: string;
  };
  daysSinceSubmission?: number;
  reviewDeadline?: string;
}

export default function IrbOfficePortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("submitted");

  const { data: applications = [], isLoading } = useQuery<EnhancedIrbApplication[]>({
    queryKey: ['/api/irb-applications'],
  });

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysSince = (date: string | Date | undefined) => {
    if (!date) return 0;
    const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWorkflowStatusBadge = (status: string, daysSince: number = 0) => {
    const colors = {
      submitted: daysSince > 14 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700",
      resubmitted: "bg-blue-100 text-blue-700",
      under_review: daysSince > 21 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700",
      revisions_requested: "bg-orange-100 text-orange-700",
      ready_for_pi: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-600",
      closed: "bg-gray-100 text-gray-600"
    };
    
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-600";
  };

  const getPriorityIcon = (daysSince: number, status: string) => {
    if (status === 'submitted' && daysSince > 14) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (status === 'under_review' && daysSince > 21) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (daysSince > 7) return <Clock className="h-4 w-4 text-orange-500" />;
    return null;
  };

  const filterApplicationsByStatus = (status: string) => {
    return applications.filter(app => {
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (app.irbNumber && app.irbNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (app.researchActivity?.sdrNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (app.principalInvestigator?.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      switch (status) {
        case 'submitted':
          return (app.workflowStatus === 'submitted' || app.workflowStatus === 'draft' || app.workflowStatus === 'resubmitted') && matchesSearch;
        case 'review':
          return app.workflowStatus === 'under_review' && matchesSearch;
        case 'ready_for_pi':
          return (app.workflowStatus === 'ready_for_pi' || app.workflowStatus === 'revisions_requested') && matchesSearch;
        case 'approved':
          return app.workflowStatus === 'approved' && matchesSearch;
        case 'closed':
          return (app.workflowStatus === 'closed' || app.workflowStatus === 'rejected') && matchesSearch;
        default:
          return matchesSearch;
      }
    });
  };

  const getTabCounts = () => {
    return {
      submitted: applications.filter(app => app.workflowStatus === 'submitted' || app.workflowStatus === 'draft').length,
      review: applications.filter(app => app.workflowStatus === 'under_review').length,
      ready_for_pi: applications.filter(app => app.workflowStatus === 'ready_for_pi' || app.workflowStatus === 'revisions_requested').length,
      approved: applications.filter(app => app.workflowStatus === 'approved').length,
      closed: applications.filter(app => app.workflowStatus === 'closed' || app.workflowStatus === 'rejected').length,
    };
  };

  const tabCounts = getTabCounts();

  const renderApplicationsTable = (status: string) => {
    const filteredApps = filterApplicationsByStatus(status);
    
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Protocol</TableHead>
            <TableHead>IRB Number</TableHead>
            <TableHead>Principal Investigator</TableHead>
            <TableHead>Submission Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredApps.map((application) => {
            const daysSince = getDaysSince(application.submissionDate);
            return (
              <TableRow key={application.id} className="hover:bg-gray-50">
                <TableCell>
                  <Link to={`/irb-office/protocols/${application.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    {application.title}
                  </Link>
                  {application.researchActivity && (
                    <div className="text-sm text-gray-500 mt-1">
                      SDR: {application.researchActivity.sdrNumber}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{application.irbNumber || "Pending"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {application.principalInvestigator ? (
                    <div className="flex items-center">
                      <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                        {application.principalInvestigator.profileImageInitials}
                      </div>
                      <span>{application.principalInvestigator.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    <span>{formatDate(application.submissionDate)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={`capitalize ${getWorkflowStatusBadge(application.workflowStatus || 'draft', daysSince)}`}
                  >
                    {(application.workflowStatus || 'draft').replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(daysSince, application.workflowStatus || 'draft')}
                    <span className="text-sm text-gray-500">{daysSince}d</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/irb-office/protocols/${application.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {status === 'submitted' && (
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {status === 'ready_for_pi' && (
                      <Button variant="ghost" size="sm">
                        <Send className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filteredApps.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                No protocols found in this category.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-400">IRB Office Portal</h1>
          <p className="text-neutral-300 mt-1">
            Manage and review institutional research protocols
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tabCounts.submitted}</div>
                <div className="text-xs text-gray-500">New Submissions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tabCounts.review}</div>
                <div className="text-xs text-gray-500">Under Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tabCounts.ready_for_pi}</div>
                <div className="text-xs text-gray-500">Ready for PI</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tabCounts.approved}</div>
                <div className="text-xs text-gray-500">Active Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{tabCounts.closed}</div>
                <div className="text-xs text-gray-500">Closed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Protocol Management</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search protocols..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="submitted">
                New Submissions ({tabCounts.submitted})
              </TabsTrigger>
              <TabsTrigger value="review">
                Under Review ({tabCounts.review})
              </TabsTrigger>
              <TabsTrigger value="ready_for_pi">
                Ready for PI ({tabCounts.ready_for_pi})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Active ({tabCounts.approved})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({tabCounts.closed})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="submitted" className="mt-4">
              {renderApplicationsTable('submitted')}
            </TabsContent>
            
            <TabsContent value="review" className="mt-4">
              {renderApplicationsTable('review')}
            </TabsContent>
            
            <TabsContent value="ready_for_pi" className="mt-4">
              {renderApplicationsTable('ready_for_pi')}
            </TabsContent>
            
            <TabsContent value="approved" className="mt-4">
              {renderApplicationsTable('approved')}
            </TabsContent>
            
            <TabsContent value="closed" className="mt-4">
              {renderApplicationsTable('closed')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}