import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grant } from "@shared/schema";
import { Plus, Search, MoreHorizontal, Download, Filter, DollarSign, Calendar, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

type EnhancedGrant = Grant & {
  lpi?: {
    id: number;
    firstName: string;
    lastName: string;
    honorificTitle: string;
  } | null;
};

export default function GrantsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: grants, isLoading } = useQuery<EnhancedGrant[]>({
    queryKey: ['/api/grants'],
  });

  const deleteGrantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/grants/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete grant');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      toast({ title: "Success", description: "Grant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete grant", variant: "destructive" });
    },
  });

  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return "—";
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  };

  const statusColors = {
    submitted: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-600",
    pending: "bg-gray-100 text-gray-700"
  };

  const getStatusColor = (status: string) => {
    return statusColors[status.toLowerCase() as keyof typeof statusColors] || "bg-gray-100 text-gray-700";
  };

  const getInvestigatorType = (grant: EnhancedGrant) => {
    return grant.investigatorType || "—";
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedGrants = grants?.filter(grant => {
    // Status filter
    if (statusFilter !== "all" && grant.status !== statusFilter) {
      return false;
    }
    
    // Year filter (based on submitted year)
    if (yearFilter !== "all" && grant.submittedYear?.toString() !== yearFilter) {
      return false;
    }
    
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        grant.title.toLowerCase().includes(query) ||
        grant.projectNumber.toLowerCase().includes(query) ||
        (grant.lpi && `${grant.lpi.firstName} ${grant.lpi.lastName}`.toLowerCase().includes(query)) ||
        (grant.fundingAgency && grant.fundingAgency.toLowerCase().includes(query)) ||
        (grant.description && grant.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  })?.sort((a, b) => {
    let aValue: any = a[sortField as keyof Grant];
    let bValue: any = b[sortField as keyof Grant];
    
    // Handle nested properties
    if (sortField === "investigatorType") {
      aValue = getInvestigatorType(a);
      bValue = getInvestigatorType(b);
    } else if (sortField === "investigatorName") {
      aValue = a.lpi ? `${a.lpi.firstName} ${a.lpi.lastName}` : "";
      bValue = b.lpi ? `${b.lpi.firstName} ${b.lpi.lastName}` : "";
    }
    
    if (aValue === null || aValue === undefined) aValue = "";
    if (bValue === null || bValue === undefined) bValue = "";
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return sortDirection === "asc" ? (aValue > bValue ? 1 : -1) : (bValue > aValue ? 1 : -1);
  });

  const handleExportCSV = () => {
    window.open('/api/grants/export/csv', '_blank');
  };

  // Get unique years and statuses for filters
  const years = [...new Set(grants?.map(g => g.submittedYear).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
  const statuses = [...new Set(grants?.map(g => g.status))].sort();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grants Office</h1>
          <p className="text-gray-600 mt-1">Manage research grants and funding applications</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportCSV}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Link href="/grants/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Grant
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Grants ({filteredAndSortedGrants?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search grants, project numbers, investigators, or funding agencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year?.toString() || ""}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("cycle")} className="h-8 p-0 font-semibold">
                      Cycle <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-32">
                    <Button variant="ghost" onClick={() => handleSort("projectNumber")} className="h-8 p-0 font-semibold">
                      Project # <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-24">
                    <Button variant="ghost" onClick={() => handleSort("investigatorType")} className="h-8 p-0 font-semibold">
                      Type <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-36">
                    <Button variant="ghost" onClick={() => handleSort("investigatorName")} className="h-8 p-0 font-semibold">
                      Investigator <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-60">
                    <Button variant="ghost" onClick={() => handleSort("title")} className="h-8 p-0 font-semibold">
                      Title <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-28">
                    <Button variant="ghost" onClick={() => handleSort("requestedAmount")} className="h-8 p-0 font-semibold">
                      Requested <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-28">
                    <Button variant="ghost" onClick={() => handleSort("awardedAmount")} className="h-8 p-0 font-semibold">
                      Awarded <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("awarded")} className="h-8 p-0 font-semibold">
                      Won <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("submittedYear")} className="h-8 p-0 font-semibold">
                      Sub Year <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("awardedYear")} className="h-8 p-0 font-semibold">
                      Award Year <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("runningTimeYears")} className="h-8 p-0 font-semibold">
                      Duration <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("currentGrantYear")} className="h-8 p-0 font-semibold">
                      Current <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-24">
                    <Button variant="ghost" onClick={() => handleSort("fundingAgency")} className="h-8 p-0 font-semibold">
                      Agency <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("startDate")} className="h-8 p-0 font-semibold">
                      Start <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-20">
                    <Button variant="ghost" onClick={() => handleSort("endDate")} className="h-8 p-0 font-semibold">
                      End <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-24">
                    <Button variant="ghost" onClick={() => handleSort("status")} className="h-8 p-0 font-semibold">
                      Status <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedGrants?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-gray-500">
                      {searchQuery || statusFilter !== "all" || yearFilter !== "all" 
                        ? "No grants match your filters." 
                        : "No grants found. Create your first grant to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedGrants?.map((grant) => (
                    <TableRow 
                      key={grant.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/grants/${grant.id}/edit`)}
                    >
                      <TableCell className="font-medium text-sm">
                        {grant.cycle || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {grant.projectNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {getInvestigatorType(grant)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {grant.lpi ? (
                          <div className="text-xs">
                            <div className="font-medium">
                              {grant.lpi.honorificTitle} {grant.lpi.firstName} {grant.lpi.lastName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-80">
                          <div className="font-medium text-xs line-clamp-2">{grant.title}</div>
                          {grant.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{grant.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(grant.requestedAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(grant.awardedAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {grant.awarded ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {grant.submittedYear || "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {grant.awardedYear || "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {grant.runningTimeYears ? `${grant.runningTimeYears}y` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {grant.currentGrantYear || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {grant.fundingAgency || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(grant.startDate)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(grant.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(grant.status)}>
                          {grant.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/grants/${grant.id}/edit`}>
                                Edit Grant
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteGrantMutation.mutate(grant.id)}
                              className="text-red-600"
                            >
                              Delete Grant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}