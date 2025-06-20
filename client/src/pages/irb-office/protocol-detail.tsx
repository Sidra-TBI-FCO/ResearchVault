import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, FileText, User, Calendar, Clock, CheckCircle, 
  XCircle, Send, AlertTriangle, MessageSquare, History
} from "lucide-react";
import { IrbApplication, ResearchActivity, Scientist } from "@shared/schema";

interface ReviewAction {
  action: 'approve' | 'reject' | 'request_revisions' | 'assign_reviewer';
  comments: string;
  reviewerId?: number;
  decision?: string;
}

export default function IrbOfficeProtocolDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const applicationId = parseInt(params.id);
  
  const [reviewComments, setReviewComments] = useState("");
  const [reviewDecision, setReviewDecision] = useState<string>("");
  const [assignedReviewer, setAssignedReviewer] = useState<string>("");

  const { data: application, isLoading } = useQuery<IrbApplication>({
    queryKey: [`/api/irb-applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const { data: researchActivity } = useQuery<ResearchActivity>({
    queryKey: [`/api/research-activities/${application?.researchActivityId}`],
    enabled: !!application?.researchActivityId,
  });

  const { data: principalInvestigator } = useQuery<Scientist>({
    queryKey: [`/api/scientists/${application?.principalInvestigatorId}`],
    enabled: !!application?.principalInvestigatorId,
  });

  const { data: reviewers = [] } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async (action: ReviewAction) => {
      console.log('Starting IRB office action:', action);
      const now = new Date().toISOString();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      const updateData = {
        workflowStatus: getNewStatus(action.action),
        reviewComments: JSON.stringify({
          ...JSON.parse(application?.reviewComments || '{}'),
          [Date.now()]: {
            action: action.action,
            comments: action.comments,
            reviewerId: action.reviewerId,
            decision: action.decision,
            timestamp: now
          }
        }),
        ...(action.reviewerId && { reviewerAssignments: JSON.stringify({ primaryReviewer: action.reviewerId }) })
      };
      
      // Set dates based on action
      if (action.action === 'approve') {
        updateData.initialApprovalDate = now;
        updateData.expirationDate = oneYearFromNow.toISOString();
      }
      
      console.log('Sending update data:', updateData);
      
      const response = await fetch(`/api/irb-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error(`Failed to update application: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Update successful:', result);
      return result;
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: [`/api/irb-applications/${applicationId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/irb-applications'] });
      
      const successMessages = {
        approve: "Protocol approved successfully",
        reject: "Protocol rejected",
        request_revisions: "Revision request sent to PI",
        assign_reviewer: "Reviewer assigned successfully"
      };
      
      toast({ 
        title: "Success", 
        description: successMessages[action.action]
      });
      
      // Reset form
      setReviewComments("");
      setReviewDecision("");
      setAssignedReviewer("");
      setSecondaryReviewer("");
      setReviewType("");
      setAssignedReviewer("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update protocol", variant: "destructive" });
    },
  });

  const getNewStatus = (action: string) => {
    switch (action) {
      case 'approve': return 'approved';
      case 'reject': return 'rejected';
      case 'request_revisions': return 'revisions_requested';
      case 'assign_reviewer': return 'under_review';
      default: return application?.workflowStatus;
    }
  };

  const handleAction = (action: 'approve' | 'reject' | 'request_revisions' | 'assign_reviewer') => {
    if (!reviewComments.trim() && action !== 'assign_reviewer') {
      toast({ title: "Error", description: "Comments are required", variant: "destructive" });
      return;
    }

    updateApplicationMutation.mutate({
      action,
      comments: reviewComments,
      reviewerId: assignedReviewer ? parseInt(assignedReviewer) : undefined,
      decision: reviewDecision
    });
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      submitted: "bg-yellow-100 text-yellow-700",
      under_review: "bg-blue-100 text-blue-700",
      ready_for_pi: "bg-purple-100 text-purple-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-600",
      closed: "bg-gray-100 text-gray-600"
    };
    
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-600";
  };

  const renderReviewHistory = () => {
    const hasReviewComments = application?.reviewComments && application.reviewComments !== '{}';
    const hasPiResponses = application?.piResponses && application.piResponses !== '{}';
    
    if (!hasReviewComments && !hasPiResponses) return null;
    
    try {
      const allEntries: Array<[string, any]> = [];
      
      // Add IRB review comments
      if (hasReviewComments) {
        let reviewComments;
        if (typeof application.reviewComments === 'string') {
          reviewComments = JSON.parse(application.reviewComments);
        } else {
          reviewComments = application.reviewComments;
        }
        
        Object.entries(reviewComments).forEach(([timestamp, review]: [string, any]) => {
          if (review.comments !== 'test' && review.action !== 'test') {
            allEntries.push([timestamp, { ...review, type: 'irb_review' }]);
          }
        });
      }
      
      // Add PI responses
      if (hasPiResponses) {
        let piResponses;
        if (typeof application.piResponses === 'string') {
          piResponses = JSON.parse(application.piResponses);
        } else {
          piResponses = application.piResponses;
        }
        
        Object.entries(piResponses).forEach(([timestamp, response]: [string, any]) => {
          allEntries.push([timestamp, { ...response, type: 'pi_submission' }]);
        });
      }
      
      if (allEntries.length === 0) return null;
      
      // Sort by timestamp (most recent first)
      allEntries.sort(([a], [b]) => {
        const timeA = isNaN(Number(a)) ? new Date(a).getTime() : Number(a);
        const timeB = isNaN(Number(b)) ? new Date(b).getTime() : Number(b);
        return timeB - timeA;
      });
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Protocol History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allEntries.map(([timestamp, entry]: [string, any], index) => (
                <div key={`${timestamp}-${index}`} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${
                        entry.type === 'irb_review' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {entry.type === 'irb_review' 
                        ? `IRB Office - ${entry.action?.replace('_', ' ') || 'Review'}` 
                        : 'PI Submission'
                      }
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(isNaN(Number(timestamp)) ? timestamp : new Date(Number(timestamp)))}
                    </span>
                  </div>
                  <p className="text-sm">{entry.comment || entry.comments}</p>
                  {entry.decision && (
                    <p className="text-sm font-medium mt-1">Decision: {entry.decision}</p>
                  )}
                  {entry.changes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Changes Made:</p>
                      <p className="text-sm text-gray-600">{entry.changes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    } catch (error) {
      console.error('Error parsing review history:', error);
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Protocol History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Unable to load history</p>
          </CardContent>
        </Card>
      );
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!application) {
    return <div>Protocol not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/irb-office")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to IRB Office
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-400 mb-2">{application.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>IRB Number: {application.irbNumber || "Pending"}</span>
            <span>•</span>
            <span>SDR: {researchActivity?.sdrNumber}</span>
            <span>•</span>
            <span>Submitted: {formatDate(application.submissionDate)}</span>
          </div>
        </div>
        <Badge 
          variant="outline"
          className={`capitalize ${getStatusBadge(application.workflowStatus || 'submitted')}`}
        >
          {application.workflowStatus === 'revisions_requested' ? 'revisions requested' :
           application.workflowStatus === 'triage_complete' ? 'triage complete' :
           (application.workflowStatus || 'submitted').replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Protocol Information */}
          <Card>
            <CardHeader>
              <CardTitle>Protocol Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Protocol Type</label>
                  <p>{application.protocolType || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Risk Level</label>
                  <p>{application.riskLevel || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Interventional</label>
                  <p>{application.isInterventional ? "Yes" : "No"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Expected Participants</label>
                  <p>{application.expectedParticipants || "—"}</p>
                </div>
              </div>
              
              {application.description && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="mt-1">{application.description}</p>
                </div>
              )}
              
              {application.vulnerablePopulations && application.vulnerablePopulations.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Vulnerable Populations</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {application.vulnerablePopulations.map((pop) => (
                      <Badge key={pop} variant="outline">{pop.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Research Activity Details */}
          {researchActivity && (
            <Card>
              <CardHeader>
                <CardTitle>Research Activity Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-600">SDR Number</label>
                    <p>{researchActivity.sdrNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Title</label>
                    <p>{researchActivity.title}</p>
                  </div>
                  {researchActivity.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p>{researchActivity.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review History */}
          {renderReviewHistory()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Principal Investigator */}
          {principalInvestigator && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Principal Investigator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-sm text-primary-700 font-medium">
                    {principalInvestigator.profileImageInitials}
                  </div>
                  <div>
                    <p className="font-medium">{principalInvestigator.name}</p>
                    <p className="text-sm text-gray-500">{principalInvestigator.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Review Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Triage Stage */}
              {(application.workflowStatus === 'submitted' || application.workflowStatus === 'resubmitted') && (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Triage Stage</h4>
                    <p className="text-sm text-blue-700 mb-3">Initial review to determine if protocol is complete and ready for formal review.</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Triage Decision</label>
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select triage decision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="complete_triage">Complete - Ready for Review</SelectItem>
                        <SelectItem value="revisions_required">Request Revisions</SelectItem>
                        <SelectItem value="rejected">Reject Protocol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Triage Comments</label>
                    <Textarea
                      className="mt-1"
                      placeholder="Enter triage comments..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('triage')}
                    disabled={!reviewComments.trim() || !reviewDecision || updateApplicationMutation.isPending}
                  >
                    Submit Triage Decision
                  </Button>
                </>
              )}

              {/* Reviewer Assignment Stage */}
              {application.workflowStatus === 'triage_complete' && (
                <>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Assign Reviewers</h4>
                    <p className="text-sm text-green-700 mb-3">Protocol has passed triage. Assign reviewers for formal review.</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Primary Reviewer</label>
                    <Select value={assignedReviewer} onValueChange={setAssignedReviewer}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select primary reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewers.map((reviewer) => (
                          <SelectItem key={reviewer.id} value={reviewer.id.toString()}>
                            {reviewer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Secondary Reviewer (Optional)</label>
                    <Select value={secondaryReviewer} onValueChange={setSecondaryReviewer}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select secondary reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {reviewers.map((reviewer) => (
                          <SelectItem key={reviewer.id} value={reviewer.id.toString()}>
                            {reviewer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Review Type</label>
                    <Select value={reviewType} onValueChange={setReviewType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select review type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expedited">Expedited Review</SelectItem>
                        <SelectItem value="full_board">Full Board Review</SelectItem>
                        <SelectItem value="exempt">Exempt Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('assign_reviewers')}
                    disabled={!assignedReviewer || !reviewType || updateApplicationMutation.isPending}
                  >
                    Assign Reviewers & Start Review
                  </Button>
                </>
              )}

              {/* Under Review Stage */}
              {application.workflowStatus === 'under_review' && (
                <>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Under Review</h4>
                    <p className="text-sm text-yellow-700 mb-3">Protocol is currently under formal review by assigned reviewers.</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Final Decision</label>
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select final decision" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approve</SelectItem>
                        <SelectItem value="approved_with_modifications">Approve with Modifications</SelectItem>
                        <SelectItem value="deferred">Defer for More Information</SelectItem>
                        <SelectItem value="disapproved">Disapprove</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Review Decision Letter</label>
                    <Textarea
                      className="mt-1"
                      placeholder="Enter detailed review decision and rationale..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => handleAction('final_decision')}
                      disabled={!reviewComments.trim() || !reviewDecision || updateApplicationMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Decision
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleAction('request_revisions')}
                      disabled={!reviewComments.trim() || updateApplicationMutation.isPending}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Request Revisions
                    </Button>
                  </div>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => handleAction('reject')}
                    disabled={!reviewComments.trim() || updateApplicationMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              {/* Send to PI */}
              {application.workflowStatus === 'ready_for_pi' && (
                <Button className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send to PI
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Protocol Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Submitted: {formatDate(application.submissionDate)}</span>
                </div>
                {application.initialApprovalDate && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>Approved: {formatDate(application.initialApprovalDate)}</span>
                  </div>
                )}
                {application.expirationDate && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    <span>Expires: {formatDate(application.expirationDate)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Force component name for debugging
IrbOfficeProtocolDetail.displayName = 'IrbOfficeProtocolDetail';