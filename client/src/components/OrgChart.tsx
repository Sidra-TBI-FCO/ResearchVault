import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scientist } from "@shared/schema";
import { ChevronUp, ChevronDown, Users } from "lucide-react";
import { formatFullName, getInitials } from "@/utils/nameUtils";

interface OrgChartProps {
  scientistId: number;
  onNavigate: (scientistId: number) => void;
}

export function OrgChart({ scientistId, onNavigate }: OrgChartProps) {
  const { data: scientist, isLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', scientistId],
    queryFn: async () => {
      const response = await fetch(`/api/scientists/${scientistId}`);
      if (!response.ok) throw new Error('Failed to fetch scientist');
      return response.json();
    },
  });

  const { data: lineManager, isLoading: managerLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', scientist?.supervisorId],
    queryFn: async () => {
      const response = await fetch(`/api/scientists/${scientist?.supervisorId}`);
      if (!response.ok) throw new Error('Failed to fetch line manager');
      return response.json();
    },
    enabled: !!scientist?.supervisorId,
  });

  const { data: directReports, isLoading: reportsLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists', scientistId, 'reports'],
    queryFn: async () => {
      const response = await fetch(`/api/scientists`);
      if (!response.ok) throw new Error('Failed to fetch scientists');
      const allScientists = await response.json();
      return allScientists.filter((s: Scientist) => s.supervisorId === scientistId);
    },
    enabled: !!scientistId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!scientist) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Organization Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Manager */}
        {scientist.supervisorId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <ChevronUp className="h-4 w-4" />
              Reports to
            </div>
            {managerLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : lineManager ? (
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3 hover:bg-neutral-50"
                onClick={() => onNavigate(lineManager.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-100 text-primary-700 text-xs">
                      {lineManager.profileImageInitials || getInitials(lineManager)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="font-medium text-sm">{formatFullName(lineManager)}</div>
                    <div className="text-xs text-neutral-500">{lineManager.jobTitle || 'No title'}</div>
                  </div>
                </div>
              </Button>
            ) : null}
          </div>
        )}

        {/* Current Scientist (highlighted) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
            <div className="w-4 h-4" /> {/* Spacer */}
            Current
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-100 text-primary-700 text-xs">
                  {scientist.profileImageInitials || getInitials(scientist)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">{formatFullName(scientist)}</div>
                <div className="text-xs text-neutral-600">{scientist.jobTitle || 'No title'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Reports */}
        {reportsLoading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <ChevronDown className="h-4 w-4" />
              Direct Reports
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        ) : directReports && directReports.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <ChevronDown className="h-4 w-4" />
              Direct Reports ({directReports.length})
            </div>
            <div className="space-y-1">
              {directReports.map((report) => (
                <Button
                  key={report.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 hover:bg-neutral-50"
                  onClick={() => onNavigate(report.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-neutral-100 text-neutral-700 text-xs">
                        {report.profileImageInitials || getInitials(report)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-medium text-sm">{formatFullName(report)}</div>
                      <div className="text-xs text-neutral-500">{report.jobTitle || 'No title'}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
              <ChevronDown className="h-4 w-4" />
              Direct Reports
            </div>
            <div className="text-sm text-neutral-400 text-center py-4">
              No direct reports
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}