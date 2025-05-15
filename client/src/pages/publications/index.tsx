import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EnhancedPublication } from "@/lib/types";
import { Plus, Search, MoreHorizontal, CalendarRange, Bookmark, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function PublicationsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location] = useLocation();
  const [filterResearchActivityId, setFilterResearchActivityId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Parse query params to check for research activity filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const researchActivityId = params.get('researchActivityId');
    if (researchActivityId) {
      setFilterResearchActivityId(parseInt(researchActivityId, 10));
    }
  }, [location]);

  const { data: publications, isLoading } = useQuery<EnhancedPublication[]>({
    queryKey: ['/api/publications'],
  });
  
  // Get research activity details if we're filtering by one
  const { data: researchActivity } = useQuery({
    queryKey: ['/api/research-activities', filterResearchActivityId],
    enabled: !!filterResearchActivityId,
  });

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short'
    });
  };

  const statusColors = {
    published: "bg-green-100 text-green-700",
    submitted: "bg-yellow-100 text-yellow-700",
    "in preparation": "bg-blue-100 text-blue-600",
    rejected: "bg-red-100 text-red-600",
    "under review": "bg-purple-100 text-purple-600"
  };

  const filteredPublications = publications?.filter(publication => {
    // First apply research activity filter
    if (filterResearchActivityId && publication.researchActivityId !== filterResearchActivityId) {
      return false;
    }
    
    // Then apply search query filter
    if (searchQuery) {
      return (
        publication.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        publication.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (publication.journal && publication.journal.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (publication.abstract && publication.abstract.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-400">Publications</h1>
          {filterResearchActivityId && researchActivity && (
            <div className="mt-1 flex items-center">
              <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700 border-blue-200">
                Filtered by SDR: {researchActivity.sdrNumber}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-sm text-blue-600" 
                onClick={() => {
                  setFilterResearchActivityId(null);
                  window.history.pushState({}, '', '/publications');
                }}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>
        <Link href="/publications/create">
          <Button className="bg-primary-500 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Publication
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Research Publications</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search publications..."
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
                  <TableHead className="w-[40%]">Title & Authors</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublications?.map((publication) => (
                  <TableRow key={publication.id}>
                    <TableCell>
                      <div className="font-medium">
                        <Link href={`/publications/${publication.id}`}>
                          <a className="hover:text-primary-500 transition-colors">{publication.title}</a>
                        </Link>
                      </div>
                      <div className="text-sm text-neutral-200 mt-1">
                        {publication.authors}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Bookmark className="h-4 w-4 mr-2 text-blue-500" />
                        <span>{publication.journal || "—"}</span>
                      </div>
                      {publication.volume && (
                        <div className="text-sm text-neutral-200 mt-1">
                          Vol. {publication.volume}{publication.issue ? `, Issue ${publication.issue}` : ''}
                          {publication.pages ? `, pp. ${publication.pages}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <CalendarRange className="h-4 w-4 mr-1 text-neutral-200" />
                        <span>{formatDate(publication.publicationDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {publication.project ? (
                        <Link href={`/projects/${publication.project.id}`}>
                          <a className="text-primary-500 hover:text-primary-600 transition-colors text-sm">
                            {publication.project.title}
                          </a>
                        </Link>
                      ) : (
                        <span className="text-neutral-200 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {publication.status && (
                        <Badge 
                          variant="outline"
                          className={`capitalize ${statusColors[publication.status.toLowerCase() as keyof typeof statusColors] || "bg-gray-100 text-gray-600"}`}
                        >
                          {publication.status}
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
                {filteredPublications?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-neutral-200">
                      No publications found matching your search.
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
