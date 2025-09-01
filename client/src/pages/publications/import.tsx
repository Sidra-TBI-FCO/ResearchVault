import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPublicationSchema, type InsertPublication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, ExternalLink, Loader2, CheckCircle, AlertCircle, Plus, BookOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImportedPublicationData {
  title: string;
  authors: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  pmid: string;
  abstract: string;
  publicationDate: string;
}

interface PublicationImportProps {
  onClose: () => void;
}

export default function PublicationImport({ onClose }: PublicationImportProps) {
  const [importType, setImportType] = useState<'pmid' | 'doi'>('pmid');
  const [searchValue, setSearchValue] = useState('');
  const [importedData, setImportedData] = useState<ImportedPublicationData | null>(null);
  const [step, setStep] = useState<'search' | 'preview' | 'journal-select'>('search');
  const [selectedResearchActivityId, setSelectedResearchActivityId] = useState<string>('');
  const [matchingJournals, setMatchingJournals] = useState<any[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string>('');
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [newJournal, setNewJournal] = useState({
    journalName: '',
    publisher: '',
    impactFactor: '',
    year: new Date().getFullYear()
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch research activities for dropdown
  const { data: researchActivities } = useQuery({
    queryKey: ['/api/research-activities'],
  });

  // Fetch scientists for authorship
  const { data: scientists } = useQuery({
    queryKey: ['/api/scientists'],
  });

  // Import publication data
  const importMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const endpoint = importType === 'pmid' 
        ? `/api/publications/import/pmid/${identifier}`
        : `/api/publications/import/doi/${encodeURIComponent(identifier)}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch publication data');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setImportedData(data);
      
      // Check for matching journals in impact factor database
      if (data.journal) {
        try {
          const journalResponse = await fetch(`/api/journal-impact-factors?searchTerm=${encodeURIComponent(data.journal)}&limit=10`);
          const journalData = await journalResponse.json();
          setMatchingJournals(journalData.data || []);
        } catch (error) {
          console.error('Error searching for journals:', error);
          setMatchingJournals([]);
        }
      }
      
      setStep('preview');
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create publication form
  const form = useForm<InsertPublication>({
    resolver: zodResolver(insertPublicationSchema),
    defaultValues: {
      title: '',
      authors: '',
      journal: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      pmid: '',
      abstract: '',
      publicationDate: undefined,
      status: 'published'
    }
  });

  // Populate form with imported data
  const populateForm = (data: ImportedPublicationData) => {
    form.reset({
      title: data.title,
      authors: data.authors,
      journal: data.journal,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      doi: data.doi,
      pmid: data.pmid,
      abstract: data.abstract,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : undefined,
      status: 'published',
      researchActivityId: selectedResearchActivityId ? parseInt(selectedResearchActivityId) : undefined
    });
  };

  // Save publication
  const saveMutation = useMutation({
    mutationFn: async (data: InsertPublication) => {
      return apiRequest('/api/publications', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      toast({
        title: "Success",
        description: "Publication imported successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleImport = () => {
    if (!searchValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter a PMID or DOI",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(searchValue.trim());
  };

  const handleSave = (data: InsertPublication) => {
    saveMutation.mutate(data);
  };

  // Add new journal to database
  const addJournalMutation = useMutation({
    mutationFn: async (journalData: any) => {
      return apiRequest('/api/journal-impact-factors', 'POST', journalData);
    },
    onSuccess: (data) => {
      setMatchingJournals([data]);
      setSelectedJournalId(data.id.toString());
      setShowAddJournal(false);
      toast({
        title: "Success",
        description: "Journal added to database successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Add Journal Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddJournal = () => {
    if (!newJournal.journalName.trim()) {
      toast({
        title: "Error",
        description: "Journal name is required",
        variant: "destructive",
      });
      return;
    }

    addJournalMutation.mutate({
      journalName: newJournal.journalName.trim(),
      publisher: newJournal.publisher.trim() || 'Unknown',
      impactFactor: newJournal.impactFactor ? parseFloat(newJournal.impactFactor) : null,
      year: newJournal.year
    });
  };

  const resetForm = () => {
    setStep('search');
    setImportedData(null);
    setSearchValue('');
    setMatchingJournals([]);
    setSelectedJournalId('');
    setShowAddJournal(false);
    setNewJournal({
      journalName: '',
      publisher: '',
      impactFactor: '',
      year: new Date().getFullYear()
    });
    form.reset();
  };

  if (step === 'search') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Import publication data automatically using a PubMed ID (PMID) or DOI
          </p>
        </div>

        <Tabs value={importType} onValueChange={(value) => setImportType(value as 'pmid' | 'doi')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pmid">PubMed ID (PMID)</TabsTrigger>
            <TabsTrigger value="doi">DOI</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pmid" className="space-y-4">
            <div>
              <Label htmlFor="pmid">PubMed ID (PMID)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="pmid"
                  placeholder="e.g., 12345678"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                />
                <Button 
                  onClick={handleImport} 
                  disabled={importMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Import
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enter the PubMed ID to automatically fetch publication details from NCBI
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="doi" className="space-y-4">
            <div>
              <Label htmlFor="doi">Digital Object Identifier (DOI)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="doi"
                  placeholder="e.g., 10.1038/nature12373"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                />
                <Button 
                  onClick={handleImport} 
                  disabled={importMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Import
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Enter the DOI to automatically fetch publication details from CrossRef
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview' && importedData) {
    // Populate form when we get to preview step
    if (!form.getValues().title) {
      populateForm(importedData);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-green-600 mb-4">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Publication data imported successfully</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Publication Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Title</Label>
              <p className="text-sm text-gray-900 mt-1">{importedData.title}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Authors</Label>
              <p className="text-sm text-gray-900 mt-1">{importedData.authors}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Journal</Label>
              <p className="text-sm text-gray-900 mt-1">{importedData.journal}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Volume</Label>
                <p className="text-sm text-gray-900 mt-1">{importedData.volume || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Issue</Label>
                <p className="text-sm text-gray-900 mt-1">{importedData.issue || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Pages</Label>
                <p className="text-sm text-gray-900 mt-1">{importedData.pages || '—'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">DOI</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {importedData.doi ? (
                    <a 
                      href={`https://doi.org/${importedData.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {importedData.doi}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : '—'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">PMID</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {importedData.pmid ? (
                    <a 
                      href={`https://pubmed.ncbi.nlm.nih.gov/${importedData.pmid}/`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {importedData.pmid}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Journal Matching Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Journal Matching
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Imported Journal: <span className="font-normal">{importedData.journal}</span>
              </Label>
            </div>
            
            {matchingJournals.length > 0 ? (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Found {matchingJournals.length} matching journal(s) in impact factor database:
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {matchingJournals.map((journal: any) => (
                    <div 
                      key={journal.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedJournalId === journal.id.toString() 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedJournalId(journal.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{journal.journalName}</div>
                          <div className="text-xs text-gray-600">
                            {journal.publisher} • {journal.year}
                            {journal.impactFactor && (
                              <span className="ml-2 text-blue-600">
                                Impact Factor: {journal.impactFactor}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedJournalId === journal.id.toString() && (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">
                  No matching journals found in the impact factor database
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    setNewJournal(prev => ({ ...prev, journalName: importedData.journal }));
                    setShowAddJournal(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add "{importedData.journal}" to Database
                </Button>
              </div>
            )}

            {/* Add Journal Form */}
            {showAddJournal && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Journal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="journalName">Journal Name *</Label>
                      <Input
                        id="journalName"
                        value={newJournal.journalName}
                        onChange={(e) => setNewJournal(prev => ({ ...prev, journalName: e.target.value }))}
                        placeholder="e.g., Nature, Science"
                      />
                    </div>
                    <div>
                      <Label htmlFor="publisher">Publisher</Label>
                      <Input
                        id="publisher"
                        value={newJournal.publisher}
                        onChange={(e) => setNewJournal(prev => ({ ...prev, publisher: e.target.value }))}
                        placeholder="e.g., Nature Publishing Group"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="impactFactor">Impact Factor</Label>
                      <Input
                        id="impactFactor"
                        type="number"
                        step="0.001"
                        value={newJournal.impactFactor}
                        onChange={(e) => setNewJournal(prev => ({ ...prev, impactFactor: e.target.value }))}
                        placeholder="e.g., 42.778"
                      />
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={newJournal.year}
                        onChange={(e) => setNewJournal(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddJournal(false)}
                      disabled={addJournalMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddJournal}
                      disabled={addJournalMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {addJournalMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Add Journal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Complete Publication Details</CardTitle>
                <p className="text-sm text-gray-600">
                  Review and edit the imported data before saving. Required fields are marked with *.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="researchActivityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Research Activity (SDR) *</FormLabel>
                      <Select 
                        value={field.value?.toString() || ''} 
                        onValueChange={(value) => {
                          field.onChange(value ? parseInt(value) : undefined);
                          setSelectedResearchActivityId(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select research activity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(researchActivities as any[])?.map((activity: any) => (
                            <SelectItem key={activity.id} value={activity.id.toString()}>
                              {activity.sdrNumber} - {activity.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authors *</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="journal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Journal *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pages</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="doi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DOI</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pmid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PMID</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="publicationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? (field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value) : ''} 
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="in preparation">In Preparation</SelectItem>
                          <SelectItem value="under review">Under Review</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="abstract"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abstract</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetForm}>
                Start Over
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Save Publication
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return null;
}