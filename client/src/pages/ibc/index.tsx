import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedIbcApplication } from "@/lib/types";
import { 
  Plus, Search, MoreHorizontal, CalendarRange, 
  FileText, AlertTriangle, FlaskConical 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function IbcList() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: applications, isLoading } = useQuery<EnhancedIbcApplication[]>({
    queryKey: ['/api/ibc-applications'],
  });

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    vetted: "bg-purple-100 text-purple-800",
    under_review: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-800"
  };

  const biosafetyLevelColors = {
    "bsl-1": "bg-green-50 text-green-600",
    "bsl-2": "bg-yellow-50 text-yellow-600",
    "bsl-3": "bg-orange-50 text-orange-600",
    "bsl-4": "bg-red-50 text-red-600"
  };

  const filteredApplications = applications?.filter(app => {
    return (
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.protocolNumber && app.protocolNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.agents && app.agents.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.principalInvestigator && app.principalInvestigator.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.project && app.project.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">IBC Applications</h1>
        <Link href="/ibc/create">
          <button 
            className="px-4 py-2 rounded-lg transition-colors hover:opacity-90"
            style={{ 
              backgroundColor: '#2D9C95',
              color: 'white',
              opacity: '1',
              visibility: 'visible',
              display: 'block'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#238B7A'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2D9C95'}
          >
            New Application
          </button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Institutional Biosafety Committee Applications</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search applications..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-64" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Application</TableHead>
                  <TableHead>Protocol #</TableHead>
                  <TableHead>Principal Investigator</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Biosafety Level</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications?.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="font-medium">
                        <Link href={`/ibc-applications/${application.id}`}>
                          <a className="hover:text-primary-500 transition-colors">{application.title}</a>
                        </Link>
                      </div>
                      {application.project && (
                        <div className="text-sm text-neutral-200 mt-1">
                          Project: <Link href={`/projects/${application.project.id}`}>
                            <a className="text-primary-500 hover:text-primary-600 transition-colors">
                              {application.project.title}
                            </a>
                          </Link>
                        </div>
                      )}
                      {application.agents && (
                        <div className="text-xs text-neutral-200 mt-1 flex items-center">
                          <FlaskConical className="h-3 w-3 mr-1" /> 
                          {application.agents}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1 text-neutral-200" />
                        <span>{application.ibcNumber || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {application.principalInvestigator ? (
                        <div className="flex items-center">
                          <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                            {application.principalInvestigator.profileImageInitials}
                          </div>
                          <span>{application.principalInvestigator.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {application.submissionDate && (
                          <div className="flex items-center mb-1">
                            <CalendarRange className="h-3 w-3 mr-1 text-neutral-200" />
                            <span>Submitted: {formatDate(application.submissionDate)}</span>
                          </div>
                        )}
                        {application.expirationDate && (
                          <div className="flex items-center">
                            <CalendarRange className="h-3 w-3 mr-1 text-neutral-200" />
                            <span>Expires: {formatDate(application.expirationDate)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {application.status && (
                        <Badge 
                          variant="outline"
                          className={`capitalize ${statusColors[application.status.toLowerCase() as keyof typeof statusColors] || "bg-gray-100 text-gray-600"}`}
                        >
                          {application.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {application.biosafetyLevel ? (
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${biosafetyLevelColors[application.biosafetyLevel.toLowerCase() as keyof typeof biosafetyLevelColors] || "bg-gray-100 text-gray-600"}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {application.biosafetyLevel}
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredApplications?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-neutral-200">
                      No IBC applications found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
