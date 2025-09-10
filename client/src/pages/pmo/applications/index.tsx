import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Plus, Search, FileText, Eye, Edit, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Mock data for now - will connect to API later
const mockApplications = [
  {
    id: 1,
    applicationId: "PMO-2025-001",
    title: "In Vitro Characterization of R. bromii–Tumor–Immune Interactions in Colorectal Cancer",
    formType: "RA-200",
    status: "draft",
    leadScientist: "Christophe Raynaud",
    projectId: "PRJ12002",
    budgetHolder: "Wouter Hendrickx",
    createdAt: "2025-07-17",
    durationMonths: 10
  },
  {
    id: 2,
    applicationId: "PMO-2025-002",
    title: "Sidra Pediatric Precision Oncology Initiative - Title Change Request",
    formType: "RA-205A",
    status: "submitted",
    leadScientist: "Sonia Davila",
    projectId: "PRJ12003",
    budgetHolder: "Wouter Hendrickx",
    createdAt: "2025-07-18",
    durationMonths: null
  }
];

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800", 
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export default function PmoApplicationsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Connect to real API
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/pmo-applications']
  });

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.application_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (app.leadScientist || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Separate applications by type
  const ra200Applications = filteredApplications.filter(app => app.form_type === 'RA-200');
  const ra205aApplications = filteredApplications.filter(app => app.form_type === 'RA-205A');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PMO Applications</h1>
          <p className="text-muted-foreground mt-1">
            Manage research activity plans and PMO application workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pmo/applications/create-ra200">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New RA-200
            </Button>
          </Link>
          <Link href="/pmo/applications/create-ra205a">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New RA-205A
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{applications.filter(app => app.status === 'draft').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold">{applications.filter(app => app.status === 'under_review').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">0</p>
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
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                Draft
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

      {/* RA-200 Applications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Research Activity Plans (RA-200)</CardTitle>
        </CardHeader>
        <CardContent>
          {ra200Applications.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No RA-200 applications found</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first RA-200 Research Activity Plan
              </p>
              <Link href="/pmo/applications/create-ra200">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create RA-200 Form
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ra200Applications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{application.title}</h3>
                        <Badge className={statusColors[application.status as keyof typeof statusColors]}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{application.form_type}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Application ID:</span>
                          <div>{application.application_id}</div>
                        </div>
                        <div>
                          <span className="font-medium">Lead Scientist:</span>
                          <div>TBD</div>
                        </div>
                        <div>
                          <span className="font-medium">Project ID:</span>
                          <div>{application.project_id || 'TBD'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>
                          <div>{application.duration_months || 'TBD'} months</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link href={`/pmo/applications/${application.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      {application.status === 'draft' && (
                        <Link href={`/pmo/applications/${application.id}/edit`}>
                          <Button size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RA-205A Applications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Research Activity Change Requests (RA-205A)</CardTitle>
        </CardHeader>
        <CardContent>
          {ra205aApplications.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No RA-205A applications found</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first RA-205A Change Request
              </p>
              <Link href="/pmo/applications/create-ra205a">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create RA-205A Form
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {ra205aApplications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{application.title}</h3>
                        <Badge className={statusColors[application.status as keyof typeof statusColors]}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{application.form_type}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Application ID:</span>
                          <div>{application.application_id}</div>
                        </div>
                        <div>
                          <span className="font-medium">Lead Scientist:</span>
                          <div>TBD</div>
                        </div>
                        <div>
                          <span className="font-medium">Project ID:</span>
                          <div>{application.project_id || 'TBD'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <div>{application.status}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Link href={`/pmo/applications/${application.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      {application.status === 'draft' && (
                        <Link href={`/pmo/applications/${application.id}/edit`}>
                          <Button size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}