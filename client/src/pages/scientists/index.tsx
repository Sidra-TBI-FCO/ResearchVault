import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Scientist } from "@shared/schema";
import { Plus, Search, MoreHorizontal, Mail, Phone, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionWrapper, useElementPermissions } from "@/components/PermissionWrapper";

export default function ScientistsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState<"name" | "department" | "title" | "activeResearchActivities">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [, navigate] = useLocation();
  const { currentUser } = useCurrentUser();
  const { canEdit } = useElementPermissions(currentUser.role, "scientists");

  const { data: scientists, isLoading } = useQuery<(Scientist & { activeResearchActivities?: number })[]>({
    queryKey: ['/api/scientists', { includeActivityCount: true }],
    queryFn: () => fetch('/api/scientists?includeActivityCount=true').then(res => res.json()),
  });

  // Fetch IRB board members
  const { data: irbMembers } = useQuery({
    queryKey: ['/api/irb-board-members'],
    queryFn: () => fetch('/api/irb-board-members').then(res => res.json()),
  });

  // Fetch IBC board members
  const { data: ibcMembers } = useQuery({
    queryKey: ['/api/ibc-board-members'],
    queryFn: () => fetch('/api/ibc-board-members').then(res => res.json()),
  });

  const filteredScientists = scientists?.filter(scientist => {
    const matchesSearch = scientist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (scientist.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (scientist.department?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    
    // Filter by job title
    if (activeTab === "management") return matchesSearch && scientist.title === "Management";
    if (activeTab === "physician") return matchesSearch && scientist.title === "Physician";
    if (activeTab === "investigator") return matchesSearch && scientist.title === "Investigator";
    if (activeTab === "staff-scientist") return matchesSearch && scientist.title === "Staff Scientist";
    if (activeTab === "research-specialist") return matchesSearch && scientist.title === "Research Specialist";
    if (activeTab === "research-assistant") return matchesSearch && scientist.title === "Research Assistant";
    if (activeTab === "phd-student") return matchesSearch && scientist.title === "PhD Student";
    if (activeTab === "post-doc") return matchesSearch && scientist.title === "Post-doctoral Fellow";
    if (activeTab === "lab-manager") return matchesSearch && scientist.title === "Lab Manager";
    
    return matchesSearch;
  });
  
  // Sort scientists based on selected sort field and direction
  const sortedScientists = filteredScientists?.sort((a, b) => {
    let fieldA: any, fieldB: any;
    
    if (sortField === 'activeResearchActivities') {
      fieldA = a.activeResearchActivities || 0;
      fieldB = b.activeResearchActivities || 0;
      return sortDirection === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    } else if (sortField === 'name') {
      // Sort by last name, ignoring titles
      const getLastName = (scientist: any) => {
        if (scientist.lastName) return scientist.lastName.toLowerCase();
        // Extract last name from full name, ignoring titles
        const nameWithoutTitle = scientist.name.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');
        const nameParts = nameWithoutTitle.trim().split(/\s+/);
        return nameParts[nameParts.length - 1].toLowerCase();
      };
      
      const lastNameA = getLastName(a);
      const lastNameB = getLastName(b);
      const comparison = lastNameA.localeCompare(lastNameB);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else {
      fieldA = a[sortField] || '';
      fieldB = b[sortField] || '';
      
      const comparison = typeof fieldA === 'string' && typeof fieldB === 'string'
        ? fieldA.localeCompare(fieldB)
        : String(fieldA).localeCompare(String(fieldB));
        
      return sortDirection === 'asc' ? comparison : -comparison;
    }
  });

  return (
    <PermissionWrapper currentUserRole={currentUser.role} navigationItem="scientists">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-neutral-400">Scientists & Staff</h1>
          <div className="flex items-center gap-3">
            {canEdit && (
              <Link href="/scientists/role-access-config">
                <button 
                  className="px-4 py-2 rounded-lg border border-sidra-teal text-sidra-teal transition-colors hover:bg-sidra-teal hover:text-white"
                >
                  Configure Role Based Access
                </button>
              </Link>
            )}
            {canEdit && (
              <Link href="/scientists/create">
                <button 
                  className="px-4 py-2 rounded-lg transition-colors hover:opacity-90 create-button"
                  style={{ 
                    backgroundColor: '#2D9C95',
                    color: 'white',
                    opacity: '1',
                    visibility: 'visible',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#238B7A'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#2D9C95'}
                >
                  Add Scientist
                </button>
              </Link>
            )}
          </div>
        </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Research Team</CardTitle>
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort by: {sortField === 'name' ? 'Name' : sortField === 'department' ? 'Department' : sortField === 'title' ? 'Job Title' : 'Active SDRs'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortField('name')}>
                    Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortField('department')}>
                    Department
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortField('title')}>
                    Job Title
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortField('activeResearchActivities')}>
                    Active SDRs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Direction Toggle */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            
              {/* Search Box */}
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search team members..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <div className="mb-4 overflow-x-auto">
              <TabsList className="flex justify-start px-6 scroll-smooth">
                <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
                <TabsTrigger value="management" className="flex-shrink-0">Management</TabsTrigger>
                <TabsTrigger value="physician" className="flex-shrink-0">Physician</TabsTrigger>
                <TabsTrigger value="investigator" className="flex-shrink-0">Investigator</TabsTrigger>
                <TabsTrigger value="staff-scientist" className="flex-shrink-0">Staff Scientist</TabsTrigger>
                <TabsTrigger value="research-specialist" className="flex-shrink-0">Research Specialist</TabsTrigger>
                <TabsTrigger value="research-assistant" className="flex-shrink-0">Research Assistant</TabsTrigger>
                <TabsTrigger value="phd-student" className="flex-shrink-0">PhD Student</TabsTrigger>
                <TabsTrigger value="post-doc" className="flex-shrink-0">Post-doctoral Fellow</TabsTrigger>
                <TabsTrigger value="lab-manager" className="flex-shrink-0">Lab Manager</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto font-bold hover:bg-transparent flex items-center"
                          onClick={() => {
                            if (sortField === 'name') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('name');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          Name
                          {sortField === 'name' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          )}
                          {sortField !== 'name' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto font-bold hover:bg-transparent flex items-center"
                          onClick={() => {
                            if (sortField === 'department') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('department');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          Department
                          {sortField === 'department' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          )}
                          {sortField !== 'department' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="p-0 h-auto font-bold hover:bg-transparent flex items-center"
                          onClick={() => {
                            if (sortField === 'title') {
                              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('title');
                              setSortDirection('asc');
                            }
                          }}
                        >
                          Job Title
                          {sortField === 'title' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          )}
                          {sortField !== 'title' && <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-center">Active SDRs</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScientists?.map((scientist) => (
                      <TableRow 
                        key={scientist.id}
                        className="cursor-pointer hover:bg-neutral-50/50 transition-colors"
                        onClick={() => navigate(`/scientists/${scientist.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium">
                              {scientist.profileImageInitials || scientist.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{scientist.name}</span>
                                {scientist.staffId && (
                                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                                    ID: {scientist.staffId}
                                  </Badge>
                                )}
                                {irbMembers?.find((member: any) => member.scientistId === scientist.id && member.isActive) && (
                                  <Badge variant="outline" className="rounded-sm bg-green-50 text-green-700 border-green-200">
                                    IRB {irbMembers.find((member: any) => member.scientistId === scientist.id)?.role === 'chair' ? 'Chair' : 
                                         irbMembers.find((member: any) => member.scientistId === scientist.id)?.role === 'deputy_chair' ? 'Deputy' : 'Member'}
                                  </Badge>
                                )}
                                {ibcMembers?.find((member: any) => member.scientistId === scientist.id && member.isActive) && (
                                  <Badge variant="outline" className="rounded-sm bg-purple-50 text-purple-700 border-purple-200">
                                    IBC {ibcMembers.find((member: any) => member.scientistId === scientist.id)?.role === 'chair' ? 'Chair' : 'Member'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{scientist.department || "—"}</TableCell>
                        <TableCell>{scientist.title || "No title"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-neutral-200">
                            {scientist.email && (
                              <a 
                                href={`mailto:${scientist.email}`} 
                                className="hover:text-primary-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            {scientist.activeResearchActivities || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/scientists/${scientist.id}`}>
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/scientists/${scientist.id}/edit`} className="edit-button">
                                    Edit Scientist
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredScientists?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-neutral-200">
                          No scientists found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </PermissionWrapper>
  );
}
