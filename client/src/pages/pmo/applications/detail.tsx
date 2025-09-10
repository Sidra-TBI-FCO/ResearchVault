import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Edit, FileText, User, Calendar, Clock, 
  MessageSquare, CheckCircle, AlertCircle, Send, Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Mock application data - will connect to API later
const mockApplication = {
  id: 1,
  applicationId: "PMO-2025-001",
  title: "In Vitro Characterization of R. bromii–Tumor–Immune Interactions in Colorectal Cancer",
  formType: "RA-200",
  status: "submitted",
  leadScientist: "Christophe Raynaud",
  projectId: "PRJ12002",
  budgetHolder: "Wouter Hendrickx",
  budgetSource: "13,000 QAR",
  abstract: "Ruminococcus bromii is a gut commensal bacterium known for its ability to degrade resistant starch and produce short-chain fatty acids such as acetate. Recent studies have highlighted its emerging role in modulating immune responses, attenuating fibrosis, and influencing the tumor microenvironment. This project explores the in vitro effects of R. bromii-derived metabolites on colorectal cancer cells, fibroblasts, and T cells using advanced 3D tumor spheroid models, transcriptomic analyses, and ECM-based assays.",
  durationMonths: 10,
  coreLabs: ["Genomics Core", "Omics Core", "Microscopy Core", "Flow Core"],
  submittedAt: "2025-09-10T08:30:00Z",
  createdAt: "2025-09-09T14:20:00Z",
  reviewHistory: [
    {
      timestamp: "2025-09-10T08:30:00Z",
      action: "submitted",
      user: "Christophe Raynaud",
      comment: "Application submitted for PMO review"
    },
    {
      timestamp: "2025-09-09T14:20:00Z", 
      action: "created",
      user: "Christophe Raynaud",
      comment: "Application created as draft"
    }
  ],
  officeComments: [],
  piComments: []
};

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800", 
  revision_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export default function PmoApplicationDetail() {
  const [, setLocation] = useLocation();
  const [match] = useRoute("/pmo/applications/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newComment, setNewComment] = useState("");

  // TODO: Connect to real API using the id from match.id
  const applicationId = match?.id;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({ 
        title: "Comment required", 
        description: "Please enter a comment",
        variant: "destructive" 
      });
      return;
    }

    try {
      // TODO: Implement API call to add PI comment
      console.log('Adding PI comment:', newComment);
      
      toast({ 
        title: "Comment added", 
        description: "Your comment has been added successfully."
      });
      
      setNewComment("");
      // TODO: Refresh application data
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to add comment",
        variant: "destructive" 
      });
    }
  };

  const canEdit = mockApplication.status === 'draft' || mockApplication.status === 'revision_requested';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setLocation('/pmo/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{mockApplication.title}</h1>
            <Badge className={statusColors[mockApplication.status as keyof typeof statusColors]}>
              {mockApplication.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline">{mockApplication.formType}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{mockApplication.applicationId}</span>
            <span>•</span>
            <span>Lead: {mockApplication.leadScientist}</span>
            <span>•</span>
            <span>Created: {formatDate(mockApplication.createdAt)}</span>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setLocation(`/pmo/applications/${applicationId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Application
          </Button>
        )}
      </div>

      <Tabs defaultValue="application" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="application">Application Details</TabsTrigger>
          <TabsTrigger value="comments">Comments & Discussion</TabsTrigger>
          <TabsTrigger value="history">History & Timeline</TabsTrigger>
          <TabsTrigger value="guide">User Guide</TabsTrigger>
        </TabsList>

        {/* Application Details */}
        <TabsContent value="application" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Application Content */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Research Activity Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Abstract</Label>
                    <div className="mt-1 p-3 bg-muted rounded border text-sm">
                      {mockApplication.abstract}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration</Label>
                      <div className="mt-1 text-sm">{mockApplication.durationMonths} months</div>
                    </div>
                    <div>
                      <Label>Budget Source</Label>
                      <div className="mt-1 text-sm">{mockApplication.budgetSource}</div>
                    </div>
                  </div>

                  <div>
                    <Label>Core Labs Required</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {mockApplication.coreLabs.map((lab, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {lab}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Application Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Application ID</Label>
                    <div className="mt-1 text-sm font-mono">{mockApplication.applicationId}</div>
                  </div>
                  <div>
                    <Label>Form Type</Label>
                    <div className="mt-1 text-sm">{mockApplication.formType}</div>
                  </div>
                  <div>
                    <Label>Lead Scientist</Label>
                    <div className="mt-1 text-sm">{mockApplication.leadScientist}</div>
                  </div>
                  <div>
                    <Label>Project ID</Label>
                    <div className="mt-1 text-sm">{mockApplication.projectId}</div>
                  </div>
                  <div>
                    <Label>Budget Holder</Label>
                    <div className="mt-1 text-sm">{mockApplication.budgetHolder}</div>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <div className="mt-1 text-sm">{formatDate(mockApplication.createdAt)}</div>
                  </div>
                  {mockApplication.submittedAt && (
                    <div>
                      <Label>Submitted</Label>
                      <div className="mt-1 text-sm">{formatDate(mockApplication.submittedAt)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Comments & Discussion */}
        <TabsContent value="comments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Comment */}
            <Card>
              <CardHeader>
                <CardTitle>Add Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="comment">Your Comment</Label>
                  <Textarea
                    id="comment"
                    placeholder="Add a comment or question for the PMO office..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </CardContent>
            </Card>

            {/* Comments History */}
            <Card>
              <CardHeader>
                <CardTitle>Comments & Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {mockApplication.officeComments.length === 0 && mockApplication.piComments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p>No comments yet</p>
                    <p className="text-xs">Comments will appear here once the PMO office reviews your application</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Comments would be rendered here */}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History & Timeline */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockApplication.reviewHistory.map((event, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b border-muted last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">{event.action.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.user}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{event.comment}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Guide */}
        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                PMO Application Process Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-full p-1 mt-0.5">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">1. Complete RA-200 Form</div>
                      <div className="text-muted-foreground text-sm">
                        Fill out all required sections including research details, requirements, duration, and core lab needs. Save as draft to continue later.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full p-1 mt-0.5">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">2. Submit for Review</div>
                      <div className="text-muted-foreground text-sm">
                        Once complete, submit your application to the PMO office for review. You'll receive email notifications about status changes.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-full p-1 mt-0.5">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">3. Respond to Feedback</div>
                      <div className="text-muted-foreground text-sm">
                        Monitor comments and respond to any questions from the PMO office. If revisions are requested, update your application and resubmit.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-full p-1 mt-0.5">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">4. Approval & SDR Creation</div>
                      <div className="text-muted-foreground text-sm">
                        Upon approval, your application automatically creates a new Research Activity (SDR) entry. You can then begin your research activities.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Application Status Types</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-800">DRAFT</Badge>
                      <span className="text-muted-foreground">Application is being prepared and can be edited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">SUBMITTED</Badge>
                      <span className="text-muted-foreground">Application submitted and awaiting PMO review</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">UNDER REVIEW</Badge>
                      <span className="text-muted-foreground">PMO office is actively reviewing the application</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">REVISION REQUESTED</Badge>
                      <span className="text-muted-foreground">Changes requested - application can be edited and resubmitted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">APPROVED</Badge>
                      <span className="text-muted-foreground">Application approved - SDR automatically created</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Need Help?</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Contact the PMO office at: <strong>researchpmo@sidra.org</strong></div>
                    <div>• Use the Comments section to ask questions during review</div>
                    <div>• Check the History tab to track all application activities</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}