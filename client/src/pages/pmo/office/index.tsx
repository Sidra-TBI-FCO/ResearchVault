import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, Search, ClipboardCheck, Clock, AlertCircle, CheckCircle, 
  MessageSquare, FileText, User, Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Mock data for now - will connect to API later
const mockApplications = [
  {
    id: 1,
    applicationId: "PMO-2025-001",
    title: "In Vitro Characterization of R. bromii–Tumor–Immune Interactions in Colorectal Cancer",
    formType: "RA-200",
    status: "submitted",
    leadScientist: "Christophe Raynaud",
    projectId: "PRJ12002",
    budgetHolder: "Wouter Hendrickx",
    submittedAt: "2025-09-10T08:30:00Z",
    createdAt: "2025-09-09T14:20:00Z",
    durationMonths: 10,
    lastActivity: "2025-09-10T08:30:00Z"
  }
];

const statusColors = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  revision_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

const statusIcons = {
  submitted: Clock,
  under_review: AlertCircle,
  revision_requested: MessageSquare,
  approved: CheckCircle,
  rejected: AlertCircle
};

export default function PmoOfficeReview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // TODO: Connect to real API
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/pmo-applications'],
    enabled: false // Disable for now since API isn't implemented yet
  });

  const filteredApplications = mockApplications.filter(app => {
    const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.leadScientist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSinceSubmission = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Less than 1 hour ago';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PMO Office Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage PMO applications from Principal Investigators
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Needs Revision</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications by title, ID, or lead scientist..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "submitted" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("submitted")}
              >
                Submitted
              </Button>
              <Button
                variant={statusFilter === "under_review" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("under_review")}
              >
                Under Review
              </Button>
              <Button
                variant={statusFilter === "revision_requested" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("revision_requested")}
              >
                Needs Revision
              </Button>
              <Button
                variant={statusFilter === "approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("approved")}
              >
                Approved
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications for Review */}
      <Card>
        <CardHeader>
          <CardTitle>Applications for Review</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "No applications are currently pending review"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const StatusIcon = statusIcons[application.status as keyof typeof statusIcons];
                
                return (
                  <div key={application.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg">{application.title}</h3>
                          <Badge className={statusColors[application.status as keyof typeof statusColors]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {application.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{application.formType}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                          <div>
                            <span className="font-medium">Application ID:</span>
                            <div>{application.applicationId}</div>
                          </div>
                          <div>
                            <span className="font-medium">Lead Scientist:</span>
                            <div>{application.leadScientist}</div>
                          </div>
                          <div>
                            <span className="font-medium">Project ID:</span>
                            <div>{application.projectId}</div>
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>
                            <div>{application.durationMonths} months</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Submitted: {formatDate(application.submittedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last activity: {getTimeSinceSubmission(application.lastActivity)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Link href={`/pmo/office/review/${application.id}`}>
                          <Button>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}