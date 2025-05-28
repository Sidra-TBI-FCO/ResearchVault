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
  createdAt: string;
  updatedAt: string;
}

export default function ProgramsList() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs'],
  });

  const filteredPrograms = programs?.filter(program => {
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
          <Button className="bg-primary-500 text-white flex-shrink-0">
            <FilePlus className="h-4 w-4 mr-1" /> New Program
          </Button>
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
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms?.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Beaker className="h-4 w-4 text-primary-500" />
                        <span>{program.programId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/programs/${program.id}`}>
                        <span className="hover:text-primary-500 transition-colors cursor-pointer">{program.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm text-neutral-200 truncate">
                        {program.description || "No description provided"}
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
                    <TableCell colSpan={4} className="text-center py-8 text-neutral-200">
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