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
import { EnhancedResearchContract } from "@/lib/types";
import { 
  Plus, Search, MoreHorizontal, Calendar, 
  DollarSign, File 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFullName } from "@/utils/nameUtils";

export default function ContractsList() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contracts, isLoading } = useQuery<EnhancedResearchContract[]>({
    queryKey: ['/api/research-contracts'],
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
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    completed: "bg-blue-100 text-blue-600",
    terminated: "bg-red-100 text-red-600",
    "under review": "bg-purple-100 text-purple-600"
  };

  const typeColors = {
    collaboration: "bg-indigo-50 text-indigo-600",
    service: "bg-green-50 text-green-600",
    "material transfer": "bg-blue-50 text-blue-600",
    confidentiality: "bg-yellow-50 text-yellow-600",
    license: "bg-purple-50 text-purple-600"
  };

  const filteredContracts = contracts?.filter(contract => {
    return (
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.description && contract.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.contractType && contract.contractType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.principalInvestigator && formatFullName(contract.principalInvestigator).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.project && contract.project.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">Research Contracts</h1>
        <Link href="/contracts/create">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            New Contract
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Active Contracts</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search contracts..."
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
                  <TableHead className="w-[30%]">Contract Title & Contractor</TableHead>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts?.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="font-medium">
                        <Link href={`/contracts/${contract.id}`}>
                          <a className="hover:text-primary-500 transition-colors">{contract.title}</a>
                        </Link>
                      </div>
                      <div className="text-sm text-neutral-200 mt-1">
                        {contract.contractorName}
                      </div>
                      {contract.principalInvestigator && (
                        <div className="text-xs text-neutral-200 mt-1 flex items-center">
                          <span>PI: {formatFullName(contract.principalInvestigator)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.contractType && (
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[contract.contractType.toLowerCase() as keyof typeof typeColors] || "bg-gray-100 text-gray-600"}`}>
                          <File className="h-3 w-3 mr-1" />
                          {contract.contractType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {contract.startDate && (
                          <div className="flex items-center mb-1">
                            <Calendar className="h-3 w-3 mr-1 text-neutral-200" />
                            <span>Start: {formatDate(contract.startDate)}</span>
                          </div>
                        )}
                        {contract.endDate && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-neutral-200" />
                            <span>End: {formatDate(contract.endDate)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contract.value ? (
                        <div className="flex items-center text-sm font-medium">
                          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                          {contract.value}
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.project ? (
                        <Link href={`/projects/${contract.project.id}`}>
                          <a className="text-primary-500 hover:text-primary-600 transition-colors text-sm">
                            {contract.project.title}
                          </a>
                        </Link>
                      ) : (
                        <span className="text-neutral-200 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contract.status && (
                        <Badge 
                          variant="outline"
                          className={`capitalize ${statusColors[contract.status.toLowerCase() as keyof typeof statusColors] || "bg-gray-100 text-gray-600"}`}
                        >
                          {contract.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContracts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-neutral-200">
                      No contracts found matching your search.
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
