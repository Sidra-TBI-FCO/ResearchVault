import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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

export default function ScientistsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState<"name" | "department" | "title">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data: scientists, isLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  const filteredScientists = scientists?.filter(scientist => {
    const matchesSearch = scientist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (scientist.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (scientist.department?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    
    // Filter by job title
    if (activeTab === "staff-scientist") return matchesSearch && scientist.title === "Staff Scientist";
    if (activeTab === "investigator") return matchesSearch && scientist.title === "Investigator";
    if (activeTab === "research-specialist") return matchesSearch && scientist.title === "Research Specialist";
    if (activeTab === "research-assistant") return matchesSearch && scientist.title === "Research Assistant";
    if (activeTab === "phd-student") return matchesSearch && scientist.title === "PhD Student";
    if (activeTab === "post-doc") return matchesSearch && scientist.title === "Post-doctoral Fellow";
    if (activeTab === "lab-manager") return matchesSearch && scientist.title === "Lab Manager";
    
    return matchesSearch;
  });
  
  // Sort scientists based on selected sort field and direction
  const sortedScientists = filteredScientists?.sort((a, b) => {
    const fieldA = a[sortField] || '';
    const fieldB = b[sortField] || '';
    
    const comparison = typeof fieldA === 'string' && typeof fieldB === 'string'
      ? fieldA.localeCompare(fieldB)
      : String(fieldA).localeCompare(String(fieldB));
      
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-400">Scientists & Staff</h1>
        <Link href="/scientists/create">
          <Button className="bg-primary-500 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Scientist
          </Button>
        </Link>
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
                    Sort by: {sortField === 'name' ? 'Name' : sortField === 'department' ? 'Department' : 'Job Title'}
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
            <TabsList className="mb-4 flex flex-wrap gap-1">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="staff-scientist">Staff Scientist</TabsTrigger>
              <TabsTrigger value="investigator">Investigator</TabsTrigger>
              <TabsTrigger value="research-specialist">Research Specialist</TabsTrigger>
              <TabsTrigger value="research-assistant">Research Assistant</TabsTrigger>
              <TabsTrigger value="phd-student">PhD Student</TabsTrigger>
              <TabsTrigger value="post-doc">Post-doctoral Fellow</TabsTrigger>
              <TabsTrigger value="lab-manager">Lab Manager</TabsTrigger>
            </TabsList>
            
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
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScientists?.map((scientist) => (
                      <TableRow key={scientist.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium">
                              {scientist.profileImageInitials || scientist.name.substring(0, 2)}
                            </div>
                            <div>
                              <Link href={`/scientists/${scientist.id}`}>
                                <span className="hover:text-primary-500 transition-colors cursor-pointer">{scientist.name}</span>
                              </Link>
                              {scientist.staffId && (
                                <span className="ml-2">
                                  <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                                    ID: {scientist.staffId}
                                  </Badge>
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{scientist.department || "—"}</TableCell>
                        <TableCell>{scientist.title || (scientist.isStaff ? "Staff" : "Principal Investigator")}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-neutral-200">
                            {scientist.email && (
                              <a href={`mailto:${scientist.email}`} className="hover:text-primary-500">
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/scientists/${scientist.id}`}>
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/scientists/${scientist.id}/edit`}>
                                  Edit Scientist
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredScientists?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-neutral-200">
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
  );
}
