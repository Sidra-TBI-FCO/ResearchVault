import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, Upload, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Star, Shield, FileText, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import type { JournalImpactFactor, InsertJournalImpactFactor, Publication } from "@shared/schema";

export default function PublicationOffice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("ip-vetting");
  
  // Impact Factor tab state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertJournalImpactFactor>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const limit = 100;

  // Debounce search term to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const offset = (currentPage - 1) * limit;
  
  const { data: impactFactorsResult, isLoading } = useQuery({
    queryKey: ['/api/journal-impact-factors', { 
      limit, 
      offset, 
      sortField, 
      sortDirection, 
      searchTerm: debouncedSearchTerm, 
      yearFilter 
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortField,
        sortDirection
      });
      
      if (debouncedSearchTerm) {
        params.append('searchTerm', debouncedSearchTerm);
      }
      
      if (yearFilter) {
        params.append('yearFilter', yearFilter);
      }
      
      const response = await fetch(`/api/journal-impact-factors?${params}`);
      if (!response.ok) throw new Error('Failed to fetch impact factors');
      return response.json();
    }
  });

  const impactFactors = impactFactorsResult?.data || [];
  const totalRecords = impactFactorsResult?.total || 0;
  const totalPages = Math.ceil(totalRecords / limit);

  // Publication queries for the first two tabs
  const { data: publicationsForIP = [], isLoading: ipPublicationsLoading } = useQuery<Publication[]>({
    queryKey: ['/api/publications', 'ip-vetting'],
    queryFn: async () => {
      const response = await fetch('/api/publications');
      if (!response.ok) throw new Error('Failed to fetch publications');
      const publications = await response.json();
      // Filter publications that need IP vetting (not yet vetted for IP office)
      return publications.filter((pub: Publication) => 
        pub.vettedForSubmissionByIpOffice === false && 
        (pub.status === 'published' || pub.status === 'Published')
      );
    },
    enabled: activeTab === "ip-vetting"
  });

  const { data: newPublications = [], isLoading: newPublicationsLoading } = useQuery<Publication[]>({
    queryKey: ['/api/publications', 'new-publications'],
    queryFn: async () => {
      const response = await fetch('/api/publications');
      if (!response.ok) throw new Error('Failed to fetch publications');
      const publications = await response.json();
      // Filter publications that have been vetted (Published*)
      return publications.filter((pub: Publication) => 
        pub.vettedForSubmissionByIpOffice === true &&
        (pub.status === 'Published *' || pub.status?.includes('*'))
      );
    },
    enabled: activeTab === "new-publications"
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertJournalImpactFactor> }) => {
      const response = await fetch(`/api/journal-impact-factors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update impact factor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-impact-factors'] });
      setEditingId(null);
      setEditForm({});
      toast({ description: "Impact factor updated successfully" });
    },
    onError: () => {
      toast({ description: "Failed to update impact factor", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/journal-impact-factors/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete impact factor');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-impact-factors'] });
      toast({ description: "Impact factor deleted successfully" });
    },
    onError: () => {
      toast({ description: "Failed to delete impact factor", variant: "destructive" });
    }
  });

  const handleEdit = (factor: JournalImpactFactor) => {
    setEditingId(factor.id);
    setEditForm({
      journalName: factor.journalName,
      year: factor.year,
      impactFactor: factor.impactFactor,
      quartile: factor.quartile,
      rank: factor.rank,
      totalCitations: factor.totalCitations,
      publisher: factor.publisher
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: editForm });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing - could be enhanced for complex cases
      const values = line.split(',');
      if (values.length >= 18) {
        const impactFactorStr = values[12];
        const impactFactor = parseFloat(impactFactorStr);
        
        if (!isNaN(impactFactor)) {
          data.push({
            journalName: values[1],
            year: 2024,
            impactFactor: impactFactor,
            quartile: values[16],
            rank: parseInt(values[17]?.split('/')[0]) || null,
            totalCitations: parseInt(values[7]) || null,
            publisher: values[4] || null
          });
        }
      }
    }

    try {
      const response = await fetch('/api/journal-impact-factors/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: data })
      });
      
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/journal-impact-factors'] });
      toast({ description: `Imported ${result.imported} of ${result.total} records` });
    } catch (error) {
      toast({ description: "Failed to import CSV data", variant: "destructive" });
    }
  };

  // Publication status update mutations
  const updatePublicationStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await fetch(`/api/publications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update publication status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      toast({ title: "Success", description: "Publication status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update publication status", variant: "destructive" });
    },
  });

  const markAsVettedMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/publications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vettedForSubmissionByIpOffice: true, status: 'Published *' }),
      });
      if (!response.ok) throw new Error('Failed to mark as vetted');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      toast({ title: "Success", description: "Publication marked as vetted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark publication as vetted", variant: "destructive" });
    },
  });

  if (isLoading && activeTab === "impact-factors") {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading impact factors...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Publication Office</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ip-vetting" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            IP Vetting ({publicationsForIP.length})
          </TabsTrigger>
          <TabsTrigger value="new-publications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            New Publications ({newPublications.length})
          </TabsTrigger>
          <TabsTrigger value="impact-factors" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Impact Factors
          </TabsTrigger>
        </TabsList>

        {/* IP Vetting Tab */}
        <TabsContent value="ip-vetting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Publications to be Vetted for IP
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ipPublicationsLoading ? (
                <div className="text-center py-8">Loading publications...</div>
              ) : publicationsForIP.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No publications pending IP vetting
                </div>
              ) : (
                <div className="space-y-4">
                  {publicationsForIP.map((pub: Publication) => (
                    <div key={pub.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link href={`/publications/${pub.id}`}>
                            <h3 className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                              {pub.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">{pub.authors}</p>
                          <p className="text-sm text-gray-500">
                            {pub.journal} • {pub.publicationDate ? format(new Date(pub.publicationDate), 'yyyy') : 'No date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{pub.status}</Badge>
                          <Button 
                            size="sm"
                            onClick={() => markAsVettedMutation.mutate(pub.id)}
                            disabled={markAsVettedMutation.isPending}
                          >
                            Mark as Vetted
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Publications Tab */}
        <TabsContent value="new-publications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                New Publications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {newPublicationsLoading ? (
                <div className="text-center py-8">Loading publications...</div>
              ) : newPublications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No new publications
                </div>
              ) : (
                <div className="space-y-4">
                  {newPublications.map((pub: Publication) => (
                    <div key={pub.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link href={`/publications/${pub.id}`}>
                            <h3 className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                              {pub.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">{pub.authors}</p>
                          <p className="text-sm text-gray-500">
                            {pub.journal} • {pub.publicationDate ? format(new Date(pub.publicationDate), 'yyyy') : 'No date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={pub.status?.includes('*') ? 'default' : 'outline'}
                            className={pub.status?.includes('*') ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {pub.status?.includes('*') ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                {pub.status}
                              </div>
                            ) : (
                              pub.status
                            )}
                          </Badge>
                          {!pub.status?.includes('*') && (
                            <Button 
                              size="sm"
                              onClick={() => markAsVettedMutation.mutate(pub.id)}
                              disabled={markAsVettedMutation.isPending}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Mark as Published *
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impact Factors Tab */}
        <TabsContent value="impact-factors" className="space-y-6">
          <div className="flex justify-between items-center">
            <div></div>
            <div className="flex gap-2">
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </span>
                </Button>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Journals</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by journal name or publisher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-32">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2024"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Impact Factors ({totalRecords.toLocaleString()} journals, showing page {currentPage} of {totalPages})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">
                    <Button variant="ghost" onClick={() => handleSort('journalName')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Journal Name {getSortIcon('journalName')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[150px]">Abbreviated</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('year')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Year {getSortIcon('year')}
                    </Button>
                  </TableHead>
                  <TableHead>ISSN</TableHead>
                  <TableHead>eISSN</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('impactFactor')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      JIF 2024 {getSortIcon('impactFactor')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('fiveYearJif')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      5-Year JIF {getSortIcon('fiveYearJif')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('jifWithoutSelfCites')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      JIF w/o Self {getSortIcon('jifWithoutSelfCites')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('jci')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      JCI {getSortIcon('jci')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('quartile')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Quartile {getSortIcon('quartile')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('rank')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Rank {getSortIcon('rank')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('totalCites')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Total Cites {getSortIcon('totalCites')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('totalArticles')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Total Articles {getSortIcon('totalArticles')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('citableItems')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Citable Items {getSortIcon('citableItems')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('citedHalfLife')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Cited Half-Life {getSortIcon('citedHalfLife')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort('citingHalfLife')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Citing Half-Life {getSortIcon('citingHalfLife')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[150px]">
                    <Button variant="ghost" onClick={() => handleSort('publisher')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                      Publisher {getSortIcon('publisher')}
                    </Button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactFactors.map((factor) => (
                  <TableRow key={factor.id}>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          value={editForm.journalName || ''}
                          onChange={(e) => setEditForm({ ...editForm, journalName: e.target.value })}
                          className="w-full"
                        />
                      ) : (
                        <span className="font-medium">{factor.journalName}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {factor.abbreviatedJournal}
                    </TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          type="number"
                          value={editForm.year || ''}
                          onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) || 0 })}
                          className="w-20"
                        />
                      ) : (
                        factor.year
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{factor.issn}</TableCell>
                    <TableCell className="text-xs">{factor.eissn}</TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          type="number"
                          step="0.001"
                          value={editForm.impactFactor || ''}
                          onChange={(e) => setEditForm({ ...editForm, impactFactor: parseFloat(e.target.value) })}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-semibold text-blue-600">{factor.impactFactor}</span>
                      )}
                    </TableCell>
                    <TableCell>{factor.fiveYearJif}</TableCell>
                    <TableCell>{factor.jifWithoutSelfCites}</TableCell>
                    <TableCell>{factor.jci}</TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          value={editForm.quartile || ''}
                          onChange={(e) => setEditForm({ ...editForm, quartile: e.target.value })}
                          className="w-16"
                        />
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          factor.quartile === 'Q1' ? 'bg-green-100 text-green-800' :
                          factor.quartile === 'Q2' ? 'bg-blue-100 text-blue-800' :
                          factor.quartile === 'Q3' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {factor.quartile}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          type="number"
                          value={editForm.rank || ''}
                          onChange={(e) => setEditForm({ ...editForm, rank: parseInt(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        factor.rank
                      )}
                    </TableCell>
                    <TableCell>{factor.totalCites?.toLocaleString()}</TableCell>
                    <TableCell>{factor.totalArticles?.toLocaleString()}</TableCell>
                    <TableCell>{factor.citableItems?.toLocaleString()}</TableCell>
                    <TableCell>{factor.citedHalfLife}</TableCell>
                    <TableCell>{factor.citingHalfLife}</TableCell>
                    <TableCell className="text-xs">
                      {editingId === factor.id ? (
                        <Input
                          value={editForm.publisher || ''}
                          onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">{factor.publisher}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(factor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(factor.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {(!impactFactors || impactFactors.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No impact factors found. Use the Import CSV button to load journal data.
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalRecords)} of {totalRecords.toLocaleString()} journals
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}