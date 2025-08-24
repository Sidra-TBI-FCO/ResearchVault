import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Biohazard,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import type { IbcApplication } from "@shared/schema";

const IBC_WORKFLOW_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800", icon: Send },
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800", icon: XCircle },
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

export default function IbcReviewPage() {
  const [, params] = useRoute("/ibc-reviewer/review/:id");
  const [, setLocation] = useLocation();
  const applicationId = params?.id ? parseInt(params.id) : null;
  const [reviewComments, setReviewComments] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: [`/api/ibc-applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const { data: scientist } = useQuery({
    queryKey: [`/api/scientists/${application?.principalInvestigatorId}`],
    enabled: !!application?.principalInvestigatorId,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { comments: string; recommendation: string }) => {
      return apiRequest(`/api/ibc-applications/${applicationId}/reviewer-feedback`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: "Your review has been sent to the IBC office.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/ibc-applications/${applicationId}`] });
      setReviewComments("");
      setRecommendation("");
      setLocation("/ibc-reviewer");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!reviewComments.trim()) {
      toast({
        title: "Comments required",
        description: "Please provide review comments before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!recommendation) {
      toast({
        title: "Recommendation required",
        description: "Please select a recommendation.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({
      comments: reviewComments,
      recommendation: recommendation,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Application not found</h3>
            <p className="text-gray-500">The requested IBC application could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = IBC_WORKFLOW_STATUSES.find(s => s.value === application.status);
  const biosafetyBadge = getBiosafetyLevelBadge(application.biosafetyLevel);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/ibc-reviewer")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Application Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{application.title}</CardTitle>
              <CardDescription className="flex items-center space-x-4 mt-2">
                <span>{application.ibcNumber}</span>
                <span>PI: {scientist?.name || 'Loading...'}</span>
                {application.submissionDate && (
                  <span>Submitted: {format(new Date(application.submissionDate), 'MMM d, yyyy')}</span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={statusConfig?.color}>
                {statusConfig?.label}
              </Badge>
              <Badge className={biosafetyBadge.color} variant="outline">
                <Biohazard className="h-3 w-3 mr-1" />
                {application.biosafetyLevel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {application.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{application.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Submit Review</span>
          </CardTitle>
          <CardDescription>
            Provide your review comments and recommendation to the IBC office
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div>
            <label className="text-sm font-medium mb-2 block">Review Comments</label>
            <Textarea
              placeholder="Provide detailed comments about the protocol. Include specific concerns, suggestions for improvement, or confirmation of compliance with biosafety requirements..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your comments will be shared with the Principal Investigator and IBC office
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => setLocation("/ibc-reviewer")}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={submitReviewMutation.isPending || !reviewComments.trim() || !recommendation}
            >
              {submitReviewMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Protocol Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">IBC Number:</span>
                  <span className="ml-2 font-mono">{application.ibcNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Biosafety Level:</span>
                  <span className="ml-2">{application.biosafetyLevel}</span>
                </div>
                <div>
                  <span className="text-gray-600">Risk Level:</span>
                  <span className="ml-2 capitalize">{application.riskLevel}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Principal Investigator</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2">{scientist?.name}</span>
                </div>
                {scientist?.department && (
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2">{scientist.department}</span>
                  </div>
                )}
                {scientist?.email && (
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2">{scientist.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}