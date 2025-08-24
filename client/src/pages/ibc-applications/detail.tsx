import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Calendar, Building, Beaker, AlertTriangle, FileText, Shield, Eye, Edit, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { IbcApplication, Scientist, ResearchActivity } from "@shared/schema";
import TimelineComments from "@/components/TimelineComments";
import { Skeleton } from "@/components/ui/skeleton";

const IBC_WORKFLOW_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800", icon: FileText },
  { value: "vetted", label: "Vetted", color: "bg-purple-100 text-purple-800", icon: Eye },
  { value: "under_review", label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800", icon: Shield },
  { value: "expired", label: "Expired", color: "bg-red-100 text-red-800", icon: AlertTriangle },
];

const BIOSAFETY_LEVELS = [
  { value: "BSL-1", label: "BSL-1", color: "bg-green-100 text-green-800", description: "Minimal risk" },
  { value: "BSL-2", label: "BSL-2", color: "bg-yellow-100 text-yellow-800", description: "Moderate risk" },
  { value: "BSL-3", label: "BSL-3", color: "bg-orange-100 text-orange-800", description: "High risk" },
  { value: "BSL-4", label: "BSL-4", color: "bg-red-100 text-red-800", description: "Extreme danger" }
];

export default function IbcApplicationDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: ibcApplication, isLoading } = useQuery<IbcApplication & {
    principalInvestigator?: { id: number; name: string; profileImageInitials: string };
    researchActivities?: ResearchActivity[];
  }>({
    queryKey: [`/api/ibc-applications/${id}`],
    enabled: !!id,
  });

  // Principal investigator data is embedded in the application response
  const scientist = ibcApplication?.principalInvestigator;

  // Get full research activity data with budget sources
  const { data: fullResearchActivities } = useQuery<ResearchActivity[]>({
    queryKey: [`/api/ibc-applications/${id}/research-activities-full`],
    queryFn: async () => {
      // Get basic activities from embedded data
      const basicActivities = ibcApplication?.researchActivities || [];
      
      // Fetch full data for each activity
      const fullActivities = await Promise.all(
        basicActivities.map(async (activity: any) => {
          const response = await fetch(`/api/research-activities/${activity.id}`);
          return response.json();
        })
      );
      
      return fullActivities;
    },
    enabled: !!ibcApplication?.researchActivities?.length,
  });

  // Use full activities if available, otherwise fall back to basic embedded data
  const researchActivities = fullResearchActivities || ibcApplication?.researchActivities;

  const { data: comments = [] } = useQuery({
    queryKey: [`/api/ibc-applications/${id}/comments`],
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ibcApplication) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Application not found</h3>
          <p className="text-gray-500 mb-4">The IBC application you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/ibc')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    const statusConfig = IBC_WORKFLOW_STATUSES.find(s => s.value === status.toLowerCase());
    if (!statusConfig) return <Badge variant="outline">{status}</Badge>;
    
    return (
      <Badge className={statusConfig.color}>
        <statusConfig.icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getBiosafetyLevelBadge = (level: string) => {
    if (!level) return <Badge variant="outline">Unknown</Badge>;
    const levelConfig = BIOSAFETY_LEVELS.find(l => l.value === level);
    if (!levelConfig) return <Badge variant="outline">{level}</Badge>;
    
    return (
      <Badge className={levelConfig.color}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        {levelConfig.label}
      </Badge>
    );
  };

  const getStatusDescription = (status: string) => {
    const descriptions = {
      draft: "Application is being prepared and has not been submitted yet.",
      submitted: "Application has been submitted and is awaiting initial review.",
      vetted: "Application has passed initial review and is being prepared for board review.",
      under_review: "Application is being reviewed by IBC board members.",
      active: "Application has been approved and is currently active.",
      expired: "Application approval has expired and requires renewal."
    };
    return descriptions[status?.toLowerCase() as keyof typeof descriptions] || "Status unknown";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/ibc')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ibcApplication.title}</h1>
            <p className="text-gray-500">{ibcApplication.ibcNumber}</p>
          </div>
        </div>
        
        {/* Action buttons based on status */}
        <div className="flex items-center space-x-2">
          {ibcApplication.status?.toLowerCase() === 'draft' ? (
            <Button onClick={() => navigate(`/ibc-applications/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Application
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate(`/ibc-applications/${id}/edit`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Application
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Principal Investigator</label>
                  <p className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{scientist?.name || 'Loading...'}</span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Biosafety Level</label>
                  <div>{getBiosafetyLevelBadge(ibcApplication.biosafetyLevel)}</div>
                </div>
                {ibcApplication.cayuseProtocolNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Cayuse Protocol Number</label>
                    <p className="font-mono">{ibcApplication.cayuseProtocolNumber}</p>
                  </div>
                )}
                {ibcApplication.shortTitle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Short Title</label>
                    <p>{ibcApplication.shortTitle}</p>
                  </div>
                )}
              </div>

              {ibcApplication.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ibcApplication.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Research Activities */}
          {researchActivities && researchActivities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Beaker className="h-5 w-5" />
                  <span>Linked Research Activities</span>
                </CardTitle>
                <CardDescription>SDRs covered by this IBC protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {researchActivities.map((activity: any) => (
                    <div key={activity.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Beaker className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium text-blue-900">{activity.title}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                                {activity.sdrNumber}
                              </Badge>
                              <Badge className={
                                activity.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                activity.status === 'planning' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                activity.status === 'completed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }>
                                {activity.status?.charAt(0).toUpperCase() + activity.status?.slice(1)}
                              </Badge>
                            </div>
                            {activity.budgetSource && activity.budgetSource.length > 0 && (
                              <div className="mb-2">
                                <span className="text-xs text-gray-500 mb-1 block">Funding Sources:</span>
                                <div className="flex flex-wrap gap-1">
                                  {activity.budgetSource.map((source: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                                      {source}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/research-activities/${activity.id}`)}
                          className="flex-shrink-0 ml-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Biosafety Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Biosafety Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Risk Level</label>
                  <Badge variant="outline" className={
                    ibcApplication.riskLevel === 'high' ? 'border-red-200 text-red-800' :
                    ibcApplication.riskLevel === 'moderate' ? 'border-yellow-200 text-yellow-800' :
                    'border-green-200 text-green-800'
                  }>
                    {ibcApplication.riskLevel?.toUpperCase() || 'NOT SET'}
                  </Badge>
                </div>
                {ibcApplication.riskGroupClassification && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Risk Group Classification</label>
                    <p>{ibcApplication.riskGroupClassification}</p>
                  </div>
                )}
              </div>

              {/* Biosafety Options */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Biosafety Options</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.recombinantSyntheticNucleicAcid ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Recombinant/Synthetic Nucleic Acid</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.wholeAnimalsAnimalMaterial ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Animal Material</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.humanNonHumanPrimateMaterial ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Human/Non-Human Primate Material</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.microorganismsInfectiousMaterial ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Microorganisms/Infectious Material</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.biologicalToxins ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Biological Toxins</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${ibcApplication.nanoparticles ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm">Nanoparticles</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                {getStatusBadge(ibcApplication.status)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {getStatusDescription(ibcApplication.status)}
              </p>
            </CardContent>
          </Card>

          {/* Timeline & Comments */}
          <TimelineComments 
            application={{
              createdAt: typeof ibcApplication.createdAt === 'string' ? ibcApplication.createdAt : ibcApplication.createdAt?.toISOString(),
              submissionDate: typeof ibcApplication.submissionDate === 'string' ? ibcApplication.submissionDate : ibcApplication.submissionDate?.toISOString(),
              vettedDate: typeof ibcApplication.vettedDate === 'string' ? ibcApplication.vettedDate : ibcApplication.vettedDate?.toISOString(),
              underReviewDate: typeof ibcApplication.underReviewDate === 'string' ? ibcApplication.underReviewDate : ibcApplication.underReviewDate?.toISOString(),
              approvalDate: typeof ibcApplication.approvalDate === 'string' ? ibcApplication.approvalDate : ibcApplication.approvalDate?.toISOString(),
              expirationDate: typeof ibcApplication.expirationDate === 'string' ? ibcApplication.expirationDate : ibcApplication.expirationDate?.toISOString(),
            }} 
            comments={comments as any} 
          />

          {/* Important Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Important Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ibcApplication.submissionDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Submitted</span>
                  <span className="text-sm font-medium">
                    {format(new Date(ibcApplication.submissionDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {ibcApplication.vettedDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vetted</span>
                  <span className="text-sm font-medium">
                    {format(new Date(ibcApplication.vettedDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {ibcApplication.underReviewDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Under Review</span>
                  <span className="text-sm font-medium">
                    {format(new Date(ibcApplication.underReviewDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {ibcApplication.approvalDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Approved</span>
                  <span className="text-sm font-medium">
                    {format(new Date(ibcApplication.approvalDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {ibcApplication.expirationDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expires</span>
                  <span className="text-sm font-medium">
                    {format(new Date(ibcApplication.expirationDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}