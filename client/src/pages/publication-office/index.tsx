import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Save, X, Upload, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Star, Shield, FileText, BarChart3, Download, Calendar, User, BookOpen, Award, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import type { JournalImpactFactor, InsertJournalImpactFactor, Publication } from "@shared/schema";

export default function PublicationOffice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("ip-vetting");
  
  // Export tab state
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportJournal, setExportJournal] = useState("");
  const [exportScientist, setExportScientist] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [searchName, setSearchName] = useState("");
  const [exportResults, setExportResults] = useState<{count: number, formattedText: string, publications: any[]} | null>(null);
  
  // Sidra Score tab state
  const [sidraYears, setSidraYears] = useState(5);
  const [firstAuthorMultiplier, setFirstAuthorMultiplier] = useState(2);
  const [lastAuthorMultiplier, setLastAuthorMultiplier] = useState(2);
  const [correspondingAuthorMultiplier, setCorrespondingAuthorMultiplier] = useState(2);
  const [seniorAuthorMultiplier, setSeniorAuthorMultiplier] = useState(2);
  const [impactFactorYear, setImpactFactorYear] = useState("publication"); // "prior", "publication", "latest"
  const [sidraRankings, setSidraRankings] = useState<any[]>([]);
  const [selectedScientistDetails, setSelectedScientistDetails] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Function to open calculation details modal
  const openCalculationDetails = (scientist: any) => {
    setSelectedScientistDetails(scientist);
    setIsDetailsModalOpen(true);
  };
  
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
      // Filter publications that have been vetted (Published status)
      return publications.filter((pub: Publication) => 
        pub.vettedForSubmissionByIpOffice === true &&
        pub.status === 'Published'
      );
    },
    enabled: activeTab === "new-publications"
  });

  // Export functionality
  const searchExportMutation = useMutation({
    mutationFn: async (filters: any) => {
      const response = await fetch('/api/publications/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to export publications');
      return response.json();
    },
    onSuccess: (data) => {
      setExportResults(data);
      toast({ title: "Success", description: `Found ${data.count} publications` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to search publications", variant: "destructive" });
    },
  });

  const handleExportSearch = () => {
    const filters = {
      startDate: exportStartDate || undefined,
      endDate: exportEndDate || undefined,
      journal: exportJournal || undefined,
      scientist: exportScientist || undefined,
      status: exportStatus || undefined
    };
    searchExportMutation.mutate(filters);
  };

  const handleCopyToClipboard = () => {
    if (exportResults?.formattedText) {
      navigator.clipboard.writeText(exportResults.formattedText).then(() => {
        toast({ title: "Success", description: "Publications copied to clipboard" });
      }).catch(() => {
        toast({ title: "Error", description: "Failed to copy to clipboard", variant: "destructive" });
      });
    }
  };

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast({ title: "Error", description: "Please enter a search name", variant: "destructive" });
      return;
    }
    
    const newSearch = {
      name: searchName,
      filters: {
        startDate: exportStartDate,
        endDate: exportEndDate,
        journal: exportJournal,
        scientist: exportScientist,
        status: exportStatus
      }
    };
    
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('publication-export-searches', JSON.stringify(updated));
    setSearchName("");
    toast({ title: "Success", description: "Search saved" });
  };

  const handleLoadSearch = (search: any) => {
    setExportStartDate(search.filters.startDate || "");
    setExportEndDate(search.filters.endDate || "");
    setExportJournal(search.filters.journal || "");
    setExportScientist(search.filters.scientist || "");
    setExportStatus(search.filters.status || "");
    toast({ title: "Success", description: "Search loaded" });
  };

  // Load saved searches on component mount
  useEffect(() => {
    const saved = localStorage.getItem('publication-export-searches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved searches:', error);
      }
    }
  }, []);

  // Sidra Score calculation
  const calculateSidraScoresMutation = useMutation({
    mutationFn: async () => {
      const config = {
        years: sidraYears,
        impactFactorYear: impactFactorYear,
        multipliers: {
          'First Author': firstAuthorMultiplier,
          'Last Author': lastAuthorMultiplier,
          'Senior Author': seniorAuthorMultiplier,
          'Corresponding Author': correspondingAuthorMultiplier
        }
      };
      
      const response = await fetch('/api/scientists/sidra-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to calculate Sidra scores');
      return response.json();
    },
    onSuccess: (data) => {
      setSidraRankings(data);
      toast({ title: "Success", description: `Calculated scores for ${data.length} scientists` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to calculate Sidra scores", variant: "destructive" });
    },
  });

  const handleCalculateSidraScores = () => {
    calculateSidraScoresMutation.mutate();
  };

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
        <h1 className="text-3xl font-bold">Outcome Office</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ip-vetting" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            IP Vetting ({publicationsForIP.length})
          </TabsTrigger>
          <TabsTrigger value="new-publications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            New Publications ({newPublications.length})
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="sidra-score" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Sidra Score
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
                                Published
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

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filters Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Export Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Start Date</Label>
                        <Input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">End Date</Label>
                        <Input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Journal</Label>
                    <Input
                      placeholder="Enter journal name..."
                      value={exportJournal}
                      onChange={(e) => setExportJournal(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={exportStatus} onValueChange={setExportStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="Concept">Concept</SelectItem>
                        <SelectItem value="Complete Draft">Complete Draft</SelectItem>
                        <SelectItem value="Vetted for submission">Vetted for submission</SelectItem>
                        <SelectItem value="Submitted for review">Submitted for review</SelectItem>
                        <SelectItem value="Under review">Under review</SelectItem>
                        <SelectItem value="Accepted/In Press">Accepted/In Press</SelectItem>
                        <SelectItem value="Published">Published</SelectItem>
                        <SelectItem value="Published *">Published *</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Author/Scientist</Label>
                    <Input
                      placeholder="Enter scientist name..."
                      value={exportScientist}
                      onChange={(e) => setExportScientist(e.target.value)}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <Label>Save Search</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Search name..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleSaveSearch}
                        disabled={!searchName.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  {savedSearches.length > 0 && (
                    <div className="space-y-2">
                      <Label>Saved Searches</Label>
                      <div className="space-y-1">
                        {savedSearches.map((search, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleLoadSearch(search)}
                          >
                            {search.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Export Results */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button 
                        className="flex items-center gap-2"
                        onClick={handleExportSearch}
                        disabled={searchExportMutation.isPending}
                      >
                        <Search className="h-4 w-4" />
                        {searchExportMutation.isPending ? 'Searching...' : 'Search Publications'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={handleCopyToClipboard}
                        disabled={!exportResults?.formattedText}
                      >
                        <Download className="h-4 w-4" />
                        Copy to Clipboard
                      </Button>
                    </div>
                    
                    {exportResults && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                          Found {exportResults.count} publication{exportResults.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    <div className="border rounded-lg p-4 min-h-[400px] bg-gray-50">
                      <Textarea
                        className="w-full h-96 font-mono text-sm bg-white"
                        placeholder="Filtered publication results will appear here in copy-paste ready format..."
                        value={exportResults?.formattedText || ""}
                        readOnly
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Sidra Score Tab */}
        <TabsContent value="sidra-score" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Score Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Time Period (Years)</Label>
                    <Select value={sidraYears.toString()} onValueChange={(value) => setSidraYears(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 years</SelectItem>
                        <SelectItem value="5">5 years</SelectItem>
                        <SelectItem value="10">10 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Impact Factor Year</Label>
                    <Select value={impactFactorYear} onValueChange={setImpactFactorYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prior">Year prior to publication</SelectItem>
                        <SelectItem value="publication">Publication year</SelectItem>
                        <SelectItem value="latest">Latest available</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {impactFactorYear === "prior" && "Uses impact factor from year before publication (what authors saw when selecting journal)"}
                      {impactFactorYear === "publication" && "Uses impact factor from the same year as publication"}
                      {impactFactorYear === "latest" && "Uses the most recent impact factor available for the journal"}
                    </p>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <Label>Authorship Multipliers</Label>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">First Author</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={firstAuthorMultiplier}
                        onChange={(e) => setFirstAuthorMultiplier(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Last Author</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lastAuthorMultiplier}
                        onChange={(e) => setLastAuthorMultiplier(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Senior Author</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={seniorAuthorMultiplier}
                        onChange={(e) => setSeniorAuthorMultiplier(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-600">Corresponding Author</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={correspondingAuthorMultiplier}
                        onChange={(e) => setCorrespondingAuthorMultiplier(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full flex items-center gap-2" 
                    variant="outline"
                    onClick={handleCalculateSidraScores}
                    disabled={calculateSidraScoresMutation.isPending}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {calculateSidraScoresMutation.isPending ? 'Calculating...' : 'Calculate Scores'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Scientist Rankings */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Scientist Rankings
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Based on publication impact factors from the last {sidraYears} years
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Calculation Formula</h4>
                      <p className="text-sm text-blue-800">
                        Sum of journal impact factors for publications in the last {sidraYears} years, 
                        using {impactFactorYear === "prior" ? "year prior" : impactFactorYear === "publication" ? "publication year" : "latest available"} impact factors.
                        Multipliers: First Author (×{firstAuthorMultiplier}), 
                        Last Author (×{lastAuthorMultiplier}), 
                        Senior Author (×{seniorAuthorMultiplier}), 
                        Corresponding Author (×{correspondingAuthorMultiplier})
                      </p>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Scientist</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Publications</TableHead>
                            <TableHead className="text-right">Sidra Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sidraRankings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Click "Calculate Scores" to generate rankings
                              </TableCell>
                            </TableRow>
                          ) : (
                            sidraRankings.map((scientist, index) => (
                              <TableRow 
                                key={scientist.id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => openCalculationDetails(scientist)}
                              >
                                <TableCell className="font-medium">
                                  {index + 1}
                                  {index === 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-800">🥇</Badge>}
                                  {index === 1 && <Badge className="ml-2 bg-gray-100 text-gray-800">🥈</Badge>}
                                  {index === 2 && <Badge className="ml-2 bg-orange-100 text-orange-800">🥉</Badge>}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {scientist.honorificTitle} {scientist.firstName} {scientist.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">{scientist.jobTitle}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {scientist.department}
                                </TableCell>
                                <TableCell className="text-right">
                                  {scientist.publicationsCount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {scientist.missingImpactFactorPublications && scientist.missingImpactFactorPublications.length > 0 ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="font-medium text-lg text-red-600 cursor-help">
                                            {scientist.sidraScore.toFixed(2)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-sm">
                                          <div className="text-sm">
                                            <p className="font-medium mb-2">Publications without impact factor data:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                              {scientist.missingImpactFactorPublications.map((title, idx) => (
                                                <li key={idx} className="text-xs">{title}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="font-medium text-lg">
                                      {scientist.sidraScore.toFixed(2)}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Years</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
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
                {impactFactors.map((factor: JournalImpactFactor) => (
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
                          value={editForm.year?.toString() || ''}
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

      {/* Calculation Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sidra Score Calculation Details
            </DialogTitle>
            <DialogDescription>
              {selectedScientistDetails && (
                <span>
                  {selectedScientistDetails.honorificTitle} {selectedScientistDetails.firstName} {selectedScientistDetails.lastName} - 
                  Score: {selectedScientistDetails.sidraScore.toFixed(2)} ({selectedScientistDetails.publicationsCount} publications)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedScientistDetails && (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Calculation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Publications</p>
                      <p className="text-lg font-semibold">{selectedScientistDetails.publicationsCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Sidra Score</p>
                      <p className="text-lg font-semibold text-blue-600">{selectedScientistDetails.sidraScore.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium">{selectedScientistDetails.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Job Title</p>
                      <p className="font-medium">{selectedScientistDetails.jobTitle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Publications with Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publication Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedScientistDetails.calculationDetails.map((pub, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="mb-2">
                          <h4 className="font-medium text-sm">{pub.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {pub.journal} • {pub.publicationDate ? format(new Date(pub.publicationDate), 'yyyy') : 'Unknown Year'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Impact Factor:</span>
                            <p className="font-medium">
                              {pub.impactFactor}{' '}
                              {pub.usedFallback ? (
                                <span className="text-orange-600">
                                  ({pub.actualYear} - fallback from {pub.targetYear})
                                </span>
                              ) : (
                                <span className="text-gray-500">({pub.actualYear})</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Authorship:</span>
                            <p className="font-medium">{pub.authorshipTypes.join(', ')}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Multiplier:</span>
                            <p className="font-medium">×{pub.multiplier} ({pub.appliedMultipliers.join(', ') || 'Base'})</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Contribution:</span>
                            <p className="font-semibold text-blue-600">{pub.publicationScore.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Missing Impact Factor Publications */}
              {selectedScientistDetails.missingImpactFactorPublications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Publications Without Impact Factor Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-2">
                      These publications were not included in the score calculation:
                    </div>
                    <ul className="space-y-2">
                      {selectedScientistDetails.missingImpactFactorPublications.map((title, index) => (
                        <li key={index} className="text-sm p-2 bg-red-50 rounded border-l-4 border-red-200">
                          {title}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}