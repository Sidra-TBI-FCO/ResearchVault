import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, Scientist, ResearchActivity, IrbApplication, IbcApplication, DataManagementPlan, Grant, Publication } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Layers, Users, Building, Beaker, FileCheck, FileSpreadsheet, Edit, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFullName } from "@/utils/nameUtils";

// Define interface for detail data
interface ResearchActivityDetail extends ResearchActivity {
  project?: Project;
}

export default function ResearchActivityDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data: activity, isLoading: activityLoading } = useQuery<ResearchActivityDetail>({
    queryKey: ['/api/research-activities', id],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
  });

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', activity?.projectId],
    queryFn: async () => {
      if (!activity?.projectId) return null;
      const response = await fetch(`/api/projects/${activity.projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!activity?.projectId,
  });

  // Fetch scientists to resolve scientist names
  const { data: scientists, isLoading: scientistsLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: async () => {
      const response = await fetch('/api/scientists');
      if (!response.ok) {
        throw new Error('Failed to fetch scientists');
      }
      return response.json();
    },
  });

  // Fetch team members for additional context
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery({
    queryKey: ['/api/research-activities', id, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch linked grants for this research activity
  const { data: linkedGrants, isLoading: grantsLoading } = useQuery<Grant[]>({
    queryKey: ['/api/research-activities', id, 'grants'],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}/grants`);
      if (!response.ok) {
        throw new Error('Failed to fetch linked grants');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Find scientists by ID
  const budgetHolder = scientists?.find(s => s.id === activity?.budgetHolderId);
  
  // Find Lead Scientist from team members (not from SDR definition)
  const leadScientistMember = teamMembers?.find((member: any) => 
    member.role === 'Lead Scientist'
  );
  const leadScientist = leadScientistMember ? scientists?.find(s => s.id === leadScientistMember.scientistId) : null;
  
  // Fetch publications for this research activity
  const { data: publications, isLoading: publicationsLoading } = useQuery<Publication[]>({
    queryKey: ['/api/publications'],
    queryFn: async () => {
      const response = await fetch('/api/publications');
      if (!response.ok) {
        throw new Error('Failed to fetch publications');
      }
      return response.json();
    },
    select: (data) => data.filter(pub => pub.researchActivityId === activity?.id),
    enabled: !!activity?.id,
  });
  
  // Fetch Data Management Plan for this research activity
  const { data: dmpData } = useQuery<DataManagementPlan[]>({
    queryKey: ['/api/data-management-plans'],
    queryFn: async () => {
      const response = await fetch('/api/data-management-plans');
      if (!response.ok) {
        throw new Error('Failed to fetch data management plans');
      }
      return response.json();
    },
    select: (data) => data.filter(dmp => dmp.researchActivityId === activity?.id),
    enabled: !!activity?.id,
  });
  
  // Fetch IRB applications for this research activity
  const { data: irbApplications } = useQuery<IrbApplication[]>({
    queryKey: ['/api/irb-applications'],
    queryFn: async () => {
      const response = await fetch('/api/irb-applications');
      if (!response.ok) {
        throw new Error('Failed to fetch IRB applications');
      }
      return response.json();
    },
    select: (data) => data.filter(irb => irb.researchActivityId === activity?.id),
    enabled: !!activity?.id,
  });
  
  // Fetch IBC applications for this research activity
  const { data: ibcApplications } = useQuery<IbcApplication[]>({
    queryKey: ['/api/research-activities', id, 'ibc-applications'],
    queryFn: async () => {
      const response = await fetch(`/api/research-activities/${id}/ibc-applications`);
      if (!response.ok) {
        throw new Error('Failed to fetch IBC applications');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (activityLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Research Activity Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The research activity you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/research-activities")}>
                Return to Research Activities List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-activities")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{activity.title}</h1>
        </div>
        <Button 
          className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
          onClick={() => navigate(`/research-activities/${activity.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Research Activity Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{activity.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">{activity.sdrNumber}</Badge>
                  <Badge className={
                    activity.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                    activity.status === 'planning' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    activity.status === 'completed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }>
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Project</h3>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>
                      {projectLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : project ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {project.name}
                        </Button>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>

                {activity.shortTitle && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Short Title</h3>
                    <p className="text-sm">{activity.shortTitle}</p>
                  </div>
                )}

                {activity.budgetHolderId && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Principal Investigator/Budget Holder</h3>
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {scientistsLoading ? (
                        <Skeleton className="h-4 w-32 inline-block" />
                      ) : budgetHolder ? (
                        <span className="text-sm">{formatFullName(budgetHolder)} ({budgetHolder.jobTitle || 'No title'})</span>
                      ) : (
                        <span className="text-sm text-orange-600">Not assigned</span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Lead Scientist</h3>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {teamMembersLoading || scientistsLoading ? (
                      <Skeleton className="h-4 w-32 inline-block" />
                    ) : leadScientist ? (
                      <span className="text-sm">{formatFullName(leadScientist)} ({leadScientist.jobTitle || 'No title'})</span>
                    ) : (
                      <span className="text-sm text-orange-600 font-medium">
                        Not assigned - 
                        <Button 
                          variant="link" 
                          className="p-0 h-auto ml-1 text-orange-600 underline"
                          onClick={() => navigate(`/research-activities/${activity.id}/team`)}
                        >
                          Add Lead Scientist
                        </Button>
                      </span>
                    )}
                  </div>
                </div>

                {activity.sidraBranch && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Sidra Branch</h3>
                    <div className="flex items-center gap-1">
                      <Beaker className="h-3 w-3" />
                      <Badge variant="outline" className="rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                        {activity.sidraBranch}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Start Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{activity.startDate ? format(new Date(activity.startDate), 'MMM d, yyyy') : 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">End Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{activity.endDate ? format(new Date(activity.endDate), 'MMM d, yyyy') : 'Ongoing'}</span>
                  </div>
                </div>

                {activity.additionalNotificationEmail && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Additional Notification Email</h3>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span className="text-sm">{activity.additionalNotificationEmail}</span>
                    </div>
                  </div>
                )}

                {activity.budgetSource && activity.budgetSource.length > 0 && (
                  <div className="col-span-full">
                    <h3 className="text-sm font-medium text-neutral-400">Budget Sources</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {activity.budgetSource.map((source, index) => (
                        <Badge key={index} variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {activity.grantCodes && activity.grantCodes.length > 0 && (
                  <div className="col-span-full">
                    <h3 className="text-sm font-medium text-neutral-400">Grant Codes</h3>
                    <div className="space-y-2 mt-1">
                      {activity.budgetSource?.map((source, index) => {
                        const grantCode = activity.grantCodes?.[index];
                        if (!grantCode) return null;
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs bg-gray-50">
                              {source}
                            </Badge>
                            <span className="text-sm font-mono">{grantCode}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {activity.description && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Description</h3>
                  <p className="mt-1">{activity.description}</p>
                </div>
              )}

              {activity.objectives && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Objectives</h3>
                  <p className="mt-1">{activity.objectives}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dmpData && dmpData.length > 0 ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate(`/data-management-plans/${dmpData[0].id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Data Management Plan</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                      {dmpData[0].dmpNumber}
                    </Badge>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate(`/data-management-plans?researchActivityId=${activity.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Data Management Plan</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                      DMP
                    </Badge>
                  </Button>
                )}
{teamMembers && teamMembers.length > 0 ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-blue-50 hover:bg-blue-100 border-blue-200" 
                    onClick={() => navigate(`/research-activities/${activity.id}/team`)}
                  >
                    <Users className="h-4 w-4 mr-2 text-blue-600" /> 
                    <span className="flex-1 text-left font-medium">Project Team</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-blue-100 text-blue-700 border-blue-300">
                      {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                    </Badge>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start bg-orange-50 hover:bg-orange-100 border-orange-200 border-2 border-dashed" 
                    onClick={() => navigate(`/research-activities/${activity.id}/team`)}
                  >
                    <Users className="h-4 w-4 mr-2 text-orange-600" /> 
                    <span className="flex-1 text-left font-medium text-orange-700">Project Team - No Members</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-orange-100 text-orange-700 border-orange-300">
                      Add Team
                    </Badge>
                  </Button>
                )}
                {/* Publications Section */}
                {publicationsLoading ? (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Publications</span>
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : publications && publications.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">Publications</span>
                      <span className="text-xs text-gray-500">({publications.length})</span>
                    </div>
                    {publications.map((publication) => (
                      <Button
                        key={publication.id}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto text-left hover:bg-green-50"
                        onClick={() => navigate(`/publications/${publication.id}`)}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm text-green-600 truncate max-w-[200px]">
                              {publication.doi || 'No DOI'}
                            </span>
                            <Badge variant="outline" className={`text-xs ${
                              publication.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' :
                              publication.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              publication.status === 'under_review' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              publication.status === 'in_preparation' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                              'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {publication.status?.replace('_', ' ') || 'unknown'}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-600 truncate w-full">{publication.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{publication.journal}</span>
                            {publication.publicationYear && (
                              <span className="text-xs text-blue-600 font-medium">
                                {publication.publicationYear}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate(`/publications?researchActivityId=${activity.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Publications</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-green-50 text-green-700 border-green-200">
                      0
                    </Badge>
                  </Button>
                )}
                
                {/* Linked Grants Section */}
                {grantsLoading ? (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Linked Grants</span>
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : linkedGrants && linkedGrants.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">Linked Grants</span>
                      <span className="text-xs text-gray-500">({linkedGrants.length})</span>
                    </div>
                    {linkedGrants.map((grant) => (
                      <Button
                        key={grant.id}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto text-left hover:bg-blue-50"
                        onClick={() => navigate(`/grants/${grant.id}/edit`)}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm text-blue-600">{grant.projectNumber}</span>
                            <Badge variant="outline" className={`text-xs ${
                              grant.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              grant.status === 'completed' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                              {grant.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-600 truncate w-full">{grant.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{grant.fundingAgency}</span>
                            {grant.awardedAmount && (
                              <span className="text-xs text-green-600 font-medium">
                                ${parseFloat(grant.awardedAmount).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : null}

                {irbApplications && irbApplications.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">IRB Applications</span>
                      <span className="text-xs text-gray-500">({irbApplications.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {irbApplications.map((irb) => (
                        <Badge 
                          key={irb.id}
                          variant="outline" 
                          className="cursor-pointer rounded-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                          onClick={() => navigate(`/irb-applications/${irb.id}`)}
                        >
                          {irb.irbNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {ibcApplications && ibcApplications.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">IBC Applications</span>
                      <span className="text-xs text-gray-500">({ibcApplications.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ibcApplications.map((ibc) => (
                        <Badge 
                          key={ibc.id}
                          variant="outline" 
                          className="cursor-pointer rounded-sm bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors"
                          onClick={() => navigate(`/ibc-applications/${ibc.id}`)}
                        >
                          {ibc.ibcNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">No documents available.</p>
              <Button variant="outline" className="w-full mt-4" disabled>
                <FileText className="h-4 w-4 mr-2" /> Add Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}