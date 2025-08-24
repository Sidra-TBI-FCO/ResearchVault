import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  Mail,
  Calendar,
  User,
  Eye
} from "lucide-react";
import { IrbApplication } from "@shared/schema";

export default function IrbReviewerDashboard() {
  const [, navigate] = useLocation();

  // Get all IRB applications that need review
  const { data: applications = [], isLoading } = useQuery<IrbApplication[]>({
    queryKey: ['/api/irb-applications'],
  });

  // Filter applications for reviewer workflow
  const reviewerApplications = applications.filter(app => 
    app.workflowStatus === 'under_review' || 
    app.workflowStatus === 'triage_complete' ||
    (app.reviewerAssignments && app.reviewerAssignments !== '{}')
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'triage_complete':
        return 'bg-cyan-100 text-cyan-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready_for_decision':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (status: string) => {
    if (status === 'triage_complete') return <AlertCircle className="h-4 w-4 text-orange-500" />;
    if (status === 'under_review') return <Clock className="h-4 w-4 text-yellow-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return <div className="p-6">Loading reviewer dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-400">IRB Reviewer Dashboard</h1>
          <p className="text-gray-600 mt-1">Review assigned protocols and manage your review tasks</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `mailto:irb-office@example.com?subject=IRB Reviewer Question&body=Dear IRB Office,%0D%0A%0D%0AI have a question regarding:%0D%0A%0D%0A[Please describe your question here]%0D%0A%0D%0ABest regards,%0D%0A[Your name]`;
          }}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Contact IRB Office
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-xl font-semibold">
                  {reviewerApplications.filter(app => app.workflowStatus === 'triage_complete').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-semibold">
                  {reviewerApplications.filter(app => app.workflowStatus === 'under_review').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ready for Decision</p>
                <p className="text-xl font-semibold">
                  {reviewerApplications.filter(app => app.workflowStatus === 'ready_for_decision').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Assigned</p>
                <p className="text-xl font-semibold">{reviewerApplications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewerApplications.length > 0 ? (
            <div className="space-y-3">
              {reviewerApplications.map((application) => (
                <div 
                  key={application.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/irb-reviewer/${application.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getPriorityIcon(application.workflowStatus)}
                        <h3 className="font-medium">{application.title}</h3>
                        <Badge 
                          variant="outline"
                          className={getStatusBadge(application.workflowStatus)}
                        >
                          {application.workflowStatus === 'triage_complete' ? 'Ready for Review' :
                           application.workflowStatus === 'under_review' ? 'Under Review' :
                           application.workflowStatus === 'ready_for_decision' ? 'Ready for Decision' :
                           application.workflowStatus}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          IRB #{application.irbNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted: {formatDate(application.submissionDate)}
                        </span>
                        {application.protocolType && (
                          <Badge variant="secondary" className="text-xs">
                            {application.protocolType}
                          </Badge>
                        )}
                      </div>
                      
                      {application.description && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {application.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No protocols assigned for review</p>
              <p className="text-sm text-gray-400 mt-1">
                New assignments will appear here when they are made by the IRB office
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                window.location.href = `mailto:irb-office@example.com?subject=Review Guidelines Request&body=Dear IRB Office,%0D%0A%0D%0AI would like to request the latest review guidelines and protocols.%0D%0A%0D%0ABest regards,%0D%0A[Your name]`;
              }}
            >
              <Mail className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Request Guidelines</span>
              <span className="text-xs text-gray-500">Email IRB office for review guidelines</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                window.location.href = `mailto:irb-office@example.com?subject=Review Extension Request&body=Dear IRB Office,%0D%0A%0D%0AI need to request an extension for reviewing protocol [Protocol Number].%0D%0A%0D%0AReason: [Please specify reason]%0D%0ARequested deadline: [Date]%0D%0A%0D%0ABest regards,%0D%0A[Your name]`;
              }}
            >
              <Clock className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium">Request Extension</span>
              <span className="text-xs text-gray-500">Request deadline extension</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                window.location.href = `mailto:irb-office@example.com?subject=Technical Support Request&body=Dear IRB Office,%0D%0A%0D%0AI need technical assistance with:%0D%0A%0D%0A[Please describe the issue]%0D%0A%0D%0ABest regards,%0D%0A[Your name]`;
              }}
            >
              <AlertCircle className="h-6 w-6 text-red-600" />
              <span className="text-sm font-medium">Technical Support</span>
              <span className="text-xs text-gray-500">Get help with technical issues</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}