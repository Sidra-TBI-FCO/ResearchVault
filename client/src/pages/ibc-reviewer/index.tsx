import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  User,
  Calendar,
  Biohazard,
  Search,
  Eye,
  Send,
  Home,
  Shield
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { IbcApplication, Scientist } from "@shared/schema";

const IBC_WORKFLOW_STATUSES = [
  { value: "submitted", label: "New Submission", color: "bg-blue-100 text-blue-800", icon: FileText },
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Eye },
];

const BIOSAFETY_LEVELS = [
  { value: "BSL-1", label: "BSL-1", color: "bg-green-100 text-green-800" },
  { value: "BSL-2", label: "BSL-2", color: "bg-yellow-100 text-yellow-800" },
  { value: "BSL-3", label: "BSL-3", color: "bg-orange-100 text-orange-800" },
  { value: "BSL-4", label: "BSL-4", color: "bg-red-100 text-red-800" }
];

export default function IbcReviewerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<IbcApplication | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { applicationId: number; comments: string; recommendation: string }) => {
      return apiRequest("PATCH", `/api/ibc-applications/${data.applicationId}`, {
        status: data.recommendation === 'approve' ? 'active' : 
                data.recommendation === 'reject' ? 'expired' : 'under_review',
        reviewComments: data.comments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ibc-applications"] });
      toast({
        title: "Review Submitted",
        description: "Your review has been submitted successfully.",
      });
      setSelectedApplication(null);
      setReviewComments("");
      setRecommendation("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive",
      });
    },
  });

  const filteredApplications = applications.filter((app: IbcApplication) => {
    const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.ibcNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getScientistName = (id: number) => {
    const scientist = scientists.find((s: Scientist) => s.id === id);
    return scientist ? scientist.name : `Scientist ${id}`;
  };

  const getBiosafetyLevelBadge = (level: string) => {
    const levelConfig = BIOSAFETY_LEVELS.find(l => l.value === level);
    return levelConfig ? levelConfig : { value: level, label: level, color: "bg-gray-100 text-gray-800" };
  };

  const handleSubmitReview = () => {
    if (!selectedApplication || !reviewComments.trim() || !recommendation) {
      toast({
        title: "Incomplete Review",
        description: "Please provide both comments and a recommendation.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      applicationId: selectedApplication.id,
      comments: reviewComments,
      recommendation,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Biohazard className="h-6 w-6" />
        <h1 className="text-2xl font-bold">IBC Reviewer Dashboard</h1>
      </div>

      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments">Review Assignments</TabsTrigger>
          <TabsTrigger value="detailed-review">Detailed Review</TabsTrigger>
          <TabsTrigger value="completed">Completed Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applications Pending Review</CardTitle>
              <CardDescription>
                IBC applications assigned for your review
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
                    <div 
                      key={app.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedApplication(app)}
                    >
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
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
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

        <TabsContent value="detailed-review" className="space-y-4">
          {selectedApplication ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Protocol Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Protocol Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Title</label>
                      <p className="font-medium">{selectedApplication.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">IBC Number</label>
                      <p className="font-mono">{selectedApplication.ibcNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Principal Investigator</label>
                      <p>{getScientistName(selectedApplication.principalInvestigatorId)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Biosafety Level</label>
                      <Badge className={getBiosafetyLevelBadge(selectedApplication.biosafetyLevel).color}>
                        <Biohazard className="h-3 w-3 mr-1" />
                        {selectedApplication.biosafetyLevel}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risk Level</label>
                      <Badge variant="outline" className={
                        selectedApplication.riskLevel === 'high' ? 'border-red-200 text-red-800' :
                        selectedApplication.riskLevel === 'moderate' ? 'border-yellow-200 text-yellow-800' :
                        'border-green-200 text-green-800'
                      }>
                        {selectedApplication.riskLevel?.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Biosafety Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-500">Recombinant DNA</label>
                        <p className={selectedApplication.recombinantDNA ? "text-orange-600" : "text-gray-600"}>
                          {selectedApplication.recombinantDNA ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500">Human Materials</label>
                        <p className={selectedApplication.humanMaterials ? "text-orange-600" : "text-gray-600"}>
                          {selectedApplication.humanMaterials ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500">Animal Work</label>
                        <p className={selectedApplication.animalWork ? "text-orange-600" : "text-gray-600"}>
                          {selectedApplication.animalWork ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-500">Field Work</label>
                        <p className={selectedApplication.fieldWork ? "text-orange-600" : "text-gray-600"}>
                          {selectedApplication.fieldWork ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    {selectedApplication.containmentProcedures && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Containment Procedures</label>
                        <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded">
                          {selectedApplication.containmentProcedures}
                        </p>
                      </div>
                    )}

                    {selectedApplication.wasteDisposalPlan && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Waste Disposal Plan</label>
                        <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded">
                          {selectedApplication.wasteDisposalPlan}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedApplication.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Protocol Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedApplication.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Review Form */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Submit Review</CardTitle>
                    <CardDescription>
                      Provide your review comments and recommendation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Review Comments</label>
                      <Textarea
                        placeholder="Provide detailed comments about the protocol, including any concerns, suggestions, or required modifications..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        rows={8}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Recommendation</label>
                      <Select value={recommendation} onValueChange={setRecommendation}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your recommendation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Approve</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="minor_revisions">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-yellow-600" />
                              <span>Request Minor Revisions</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="major_revisions">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span>Request Major Revisions</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="reject">
                            <div className="flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span>Reject</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button 
                        onClick={handleSubmitReview}
                        disabled={!reviewComments.trim() || !recommendation || submitReviewMutation.isPending}
                        className="flex-1"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedApplication(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Application</h3>
                <p className="text-gray-500">Choose an application from the Review Assignments tab to begin your review.</p>
              </CardContent>
            </Card>
          )}
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