import { format } from "date-fns";
import { 
  FileText, 
  Send, 
  Eye, 
  CheckCircle, 
  Clock, 
  MessageCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineEntry {
  date: Date;
  type: 'status' | 'comment';
  element: React.ReactNode;
}

interface Comment {
  id: number;
  comment: string;
  commentType: 'office_comment' | 'reviewer_feedback' | 'pi_response' | 'status_change';
  authorName?: string;
  createdAt: string;
}

interface Application {
  createdAt?: string;
  submissionDate?: string;
  vettedDate?: string;
  underReviewDate?: string;
  approvalDate?: string;
  expirationDate?: string;
}

interface TimelineCommentsProps {
  application: Application;
  comments: Comment[];
  title?: string;
  showHeader?: boolean;
}

export default function TimelineComments({ 
  application, 
  comments, 
  title = "Timeline & Comments",
  showHeader = true 
}: TimelineCommentsProps) {
  
  const createTimelineEntries = (): TimelineEntry[] => {
    const timelineEntries: TimelineEntry[] = [];
    
    // Add status timeline events based on application dates
    if (application.createdAt) {
      timelineEntries.push({
        date: new Date(application.createdAt),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Draft Created</p>
              <p className="text-sm text-gray-500">Protocol saved as draft</p>
            </div>
          </div>
        )
      });
    }
    
    if (application.submissionDate) {
      timelineEntries.push({
        date: new Date(application.submissionDate),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <Send className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Submitted</p>
              <p className="text-sm text-gray-500">Application submitted for review</p>
            </div>
          </div>
        )
      });
    }
    
    if (application.vettedDate) {
      timelineEntries.push({
        date: new Date(application.vettedDate),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Vetted</p>
              <p className="text-sm text-gray-500">Initial review completed</p>
            </div>
          </div>
        )
      });
    }
    
    if (application.underReviewDate) {
      timelineEntries.push({
        date: new Date(application.underReviewDate),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Under Review</p>
              <p className="text-sm text-gray-500">Assigned to board members</p>
            </div>
          </div>
        )
      });
    }
    
    if (application.approvalDate) {
      timelineEntries.push({
        date: new Date(application.approvalDate),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Approved</p>
              <p className="text-sm text-gray-500">Protocol approved for implementation</p>
            </div>
          </div>
        )
      });
    }
    
    if (application.expirationDate) {
      timelineEntries.push({
        date: new Date(application.expirationDate),
        type: 'status',
        element: (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Expires</p>
              <p className="text-sm text-gray-500">Protocol expiration date</p>
            </div>
          </div>
        )
      });
    }
    
    // Add comments from the separate comments table
    if (comments && comments.length > 0) {
      comments.forEach((comment: Comment) => {
        // Skip status_change comments as they're redundant with the status timeline events above
        if (comment.commentType === 'status_change') {
          return;
        }
        
        const commentDate = new Date(comment.createdAt);
        let bgClass = 'bg-amber-50 border-amber-200';
        let iconClass = 'text-amber-600';
        let titleClass = 'text-amber-800';
        let textClass = 'text-amber-700';
        let authorClass = 'text-amber-600';
        let commentTitle = 'Comment';
        
        // Style based on comment type
        switch (comment.commentType) {
          case 'office_comment':
            bgClass = 'bg-amber-50 border-amber-200';
            iconClass = 'text-amber-600';
            titleClass = 'text-amber-800';
            textClass = 'text-amber-700';
            authorClass = 'text-amber-600';
            commentTitle = 'Office Comment';
            break;
          case 'reviewer_feedback':
            bgClass = 'bg-orange-50 border-orange-200';
            iconClass = 'text-orange-600';
            titleClass = 'text-orange-800';
            textClass = 'text-orange-700';
            authorClass = 'text-orange-600';
            commentTitle = 'Reviewer Feedback';
            break;
          case 'pi_response':
            bgClass = 'bg-blue-50 border-blue-200';
            iconClass = 'text-blue-600';
            titleClass = 'text-blue-800';
            textClass = 'text-blue-700';
            authorClass = 'text-blue-600';
            commentTitle = 'PI Response';
            break;
          default:
            bgClass = 'bg-gray-50 border-gray-200';
            iconClass = 'text-gray-600';
            titleClass = 'text-gray-800';
            textClass = 'text-gray-700';
            authorClass = 'text-gray-600';
            commentTitle = 'Comment';
        }
        
        timelineEntries.push({
          date: commentDate,
          type: 'comment',
          element: (
            <div className={`p-3 ${bgClass} border rounded-lg`}>
              <div className="flex items-start gap-2">
                <MessageCircle className={`h-4 w-4 ${iconClass} mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium ${titleClass}`}>{commentTitle}</h4>
                    <span className={`text-xs ${authorClass}`}>
                      {comment.authorName || 'Unknown'}
                    </span>
                  </div>
                  <p className={`text-sm ${textClass}`}>{comment.comment}</p>
                </div>
              </div>
            </div>
          )
        });
      });
    }
    
    // Sort all entries chronologically
    timelineEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return timelineEntries;
  };

  const timelineEntries = createTimelineEntries();

  const TimelineContent = () => (
    <div className="space-y-3">
      {timelineEntries.map((entry, index) => (
        <div key={`timeline-${entry.type}-${index}`} className="relative">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-xs text-gray-400 w-20">
              {format(entry.date, 'MMM d, HH:mm')}
            </div>
            <div className="flex-1">
              {entry.element}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!showHeader) {
    return <TimelineContent />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TimelineContent />
      </CardContent>
    </Card>
  );
}