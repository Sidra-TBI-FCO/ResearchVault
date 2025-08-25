import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Beaker, FilePlus, Search, MoreHorizontal } from "lucide-react";

interface Program {
  id: number;
  programId: string;
  name: string;
  description: string | null;
  programDirectorId: number | null;
  researchCoLeadId: number | null;
  clinicalCoLead1Id: number | null;
  clinicalCoLead2Id: number | null;
  createdAt: string;
  updatedAt: string;
  
  // Related entities
  programDirector?: Scientist;
  researchCoLead?: Scientist;
  clinicalCoLead1?: Scientist;
  clinicalCoLead2?: Scientist;
}

interface Scientist {
  id: number;
  name: string;
  profileImageInitials?: string;
}

export default function ProgramsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs'],
  });

  const { data: scientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  // Enhance programs with related data
  const enhancedPrograms = programs?.map(program => {
    const programDirector = program.programDirectorId ? 
      scientists?.find(s => s.id === program.programDirectorId) : undefined;
    const researchCoLead = program.researchCoLeadId ? 
      scientists?.find(s => s.id === program.researchCoLeadId) : undefined;
    const clinicalCoLead1 = program.clinicalCoLead1Id ? 
      scientists?.find(s => s.id === program.clinicalCoLead1Id) : undefined;
    const clinicalCoLead2 = program.clinicalCoLead2Id ? 
      scientists?.find(s => s.id === program.clinicalCoLead2Id) : undefined;
    return {
      ...program,
      programDirector,
      researchCoLead,
      clinicalCoLead1,
      clinicalCoLead2
    };
  });

  const filteredPrograms = enhancedPrograms?.filter(program => {
    const matchesSearch = 
      program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (program.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      program.programId.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold text-neutral-400">Research Programs (PRM)</h1>
        <Link href="/programs/create">
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
            New Program
          </button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>All Programs</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search programs..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
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
                  <TableHead>Program ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Director</TableHead>
                  <TableHead>Co-Leads</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms?.map((program) => (
                  <TableRow 
                    key={program.id} 
                    className="cursor-pointer hover:bg-neutral-50/50 transition-colors"
                    onClick={() => navigate(`/programs/${program.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Beaker className="h-4 w-4 text-primary-500" />
                        <span>{program.programId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{program.name}</span>
                    </TableCell>
                    <TableCell>
                      {program.programDirector ? (
                        <div className="flex items-center">
                          <div className="h-7 w-7 rounded-full bg-primary-200 flex items-center justify-center text-xs text-primary-700 font-medium mr-2">
                            {program.programDirector.profileImageInitials || program.programDirector.name.substring(0, 2)}
                          </div>
                          <span className="text-sm">{program.programDirector.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {program.researchCoLead && (
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-blue-200 flex items-center justify-center text-xs text-blue-700 font-medium mr-2">
                              {program.researchCoLead.profileImageInitials || program.researchCoLead.name.substring(0, 2)}
                            </div>
                            <span className="text-xs text-gray-700">Research: {program.researchCoLead.name}</span>
                          </div>
                        )}
                        {program.clinicalCoLead1 && (
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-green-200 flex items-center justify-center text-xs text-green-700 font-medium mr-2">
                              {program.clinicalCoLead1.profileImageInitials || program.clinicalCoLead1.name.substring(0, 2)}
                            </div>
                            <span className="text-xs text-gray-700">Clinical 1: {program.clinicalCoLead1.name}</span>
                          </div>
                        )}
                        {program.clinicalCoLead2 && (
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-green-200 flex items-center justify-center text-xs text-green-700 font-medium mr-2">
                              {program.clinicalCoLead2.profileImageInitials || program.clinicalCoLead2.name.substring(0, 2)}
                            </div>
                            <span className="text-xs text-gray-700">Clinical 2: {program.clinicalCoLead2.name}</span>
                          </div>
                        )}
                        {!program.researchCoLead && !program.clinicalCoLead1 && !program.clinicalCoLead2 && (
                          <span className="text-gray-600 text-sm">No co-leads assigned</span>
                        )}
                      </div>
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
                            <Link href={`/programs/${program.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/programs/${program.id}/edit`}>
                              Edit Program
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPrograms?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-600">
                      No programs found matching your search.
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