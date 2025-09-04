import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  CheckCircle, 
  User,
  Calendar,
  Biohazard,
  Search,
  Eye
} from "lucide-react";
import type { IbcApplication } from "@shared/schema";

const IBC_WORKFLOW_STATUSES = [
  { value: "submitted", label: "New Submission", color: "bg-blue-100 text-blue-800", icon: FileText },
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Eye },
];

const getBiosafetyLevelBadge = (level: string) => {
  const badges = {
    "BSL-1": { color: "bg-green-100 text-green-800", description: "Minimal risk" },
    "BSL-2": { color: "bg-yellow-100 text-yellow-800", description: "Moderate risk" },
    "BSL-3": { color: "bg-orange-100 text-orange-800", description: "High risk" },
    "BSL-4": { color: "bg-red-100 text-red-800", description: "Extreme danger" }
  };
  return badges[level as keyof typeof badges] || { color: "bg-gray-100 text-gray-800", description: "Unknown" };
};

export default function IbcReviewerPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Only show applications that are ready for review
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/ibc-applications"],
    select: (data: IbcApplication[]) => 
      data.filter(app => 
        app.status?.toLowerCase() === 'submitted' || 
        app.status?.toLowerCase() === 'vetted' ||
        app.status?.toLowerCase() === 'under_review'
      ),
  });

  const { data: scientists = [] } = useQuery({
    queryKey: ["/api/scientists"],
  });

  const getScientistName = (scientistId: number) => {
    const scientist = scientists.find((s: any) => s.id === scientistId);
    return scientist?.name || `Scientist ID: ${scientistId}`;
  };

  const filteredApplications = applications.filter(app =>
    app.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.ibcNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getScientistName(app.principalInvestigatorId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Biohazard className="h-6 w-6" />
          <h1 className="text-2xl font-bold">IBC Reviewer Dashboard</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Biohazard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">IBC Reviewer Dashboard</h1>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
          <TabsTrigger value="completed">Completed Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applications Pending Review</CardTitle>
              <CardDescription>
                Click on any application to start your review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or IBC number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3">
                {filteredApplications.map((app: IbcApplication) => {
                  const statusConfig = IBC_WORKFLOW_STATUSES.find(s => s.value === app.status?.toLowerCase());
                  const biosafetyBadge = getBiosafetyLevelBadge(app.biosafetyLevel);
                  const StatusIcon = statusConfig?.icon || FileText;

                  return (
                    <Link key={app.id} href={`/ibc-reviewer/review/${app.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-medium">{app.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>{app.ibcNumber}</span>
                                <span className="flex items-center space-x-1">
                                  <User className="h-3 w-3" />
                                  <span>PI: {getScientistName(app.principalInvestigatorId)}</span>
                                </span>
                                <Badge className={biosafetyBadge.color} variant="outline">
                                  <Biohazard className="h-3 w-3 mr-1" />
                                  {app.biosafetyLevel}
                                </Badge>
                                {app.submissionDate && (
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>Submitted: {new Date(app.submissionDate).toLocaleDateString()}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={statusConfig?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig?.label}
                          </Badge>
                          <Eye className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {filteredApplications.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications to review</h3>
                    <p className="text-gray-500">
                      {applications.length === 0 
                        ? "There are no IBC applications pending review at this time."
                        : "No applications match your search criteria."
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Completed Reviews</CardTitle>
              <CardDescription>
                Applications you have previously reviewed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Review History</h3>
                <p className="text-gray-500">Review history tracking will be available in a future update.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}