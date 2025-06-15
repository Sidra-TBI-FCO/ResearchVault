import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchActivity, Publication, Patent, PublicationAuthor, Scientist, InsertPublicationAuthor } from "@shared/schema";
import { ArrowLeft, Calendar, FileText, Book, Layers, ExternalLink, Award, Edit, Plus, Trash2, Users, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PublicationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);
  const { toast } = useToast();
  const [isAddAuthorOpen, setIsAddAuthorOpen] = useState(false);
  const [selectedScientist, setSelectedScientist] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [authorPosition, setAuthorPosition] = useState<string>("");

  const { data: publication, isLoading: publicationLoading } = useQuery<Publication>({
    queryKey: [`/api/publications/${id}`],
  });

  const { data: publicationAuthors = [], isLoading: authorsLoading } = useQuery<(PublicationAuthor & { scientist: Scientist })[]>({
    queryKey: [`/api/publications/${id}/authors`],
    enabled: !!publication,
  });

  const { data: scientists = [], isLoading: scientistsLoading } = useQuery<Scientist[]>({
    queryKey: [`/api/scientists`],
  });

  // Mutations for author management
  const addAuthorMutation = useMutation({
    mutationFn: async (data: { scientistId: number; authorshipType: string; authorPosition?: number }) => {
      const response = await fetch(`/api/publications/${id}/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add author');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/publications/${id}/authors`] });
      toast({ title: "Success", description: "Author added successfully" });
      setIsAddAuthorOpen(false);
      setSelectedScientist("");
      setSelectedRole("");
      setAuthorPosition("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add author", variant: "destructive" });
    },
  });

  const removeAuthorMutation = useMutation({
    mutationFn: async (scientistId: number) => {
      const response = await fetch(`/api/publications/${id}/authors/${scientistId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove author');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/publications/${id}/authors`] });
      toast({ title: "Success", description: "Author removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove author", variant: "destructive" });
    },
  });

  const handleAddAuthor = () => {
    if (!selectedScientist || !selectedRole) {
      toast({ title: "Error", description: "Please select both scientist and role", variant: "destructive" });
      return;
    }

    addAuthorMutation.mutate({
      scientistId: parseInt(selectedScientist),
      authorshipType: selectedRole,
      authorPosition: authorPosition ? parseInt(authorPosition) : undefined,
    });
  };

  const availableScientists = scientists
    .filter(scientist => {
      // Exclude scientists already added as authors
      if (publicationAuthors.some(author => author.scientistId === scientist.id)) {
        return false;
      }
      
      // Filter by names in the publication's comma-separated author list
      if (publication?.authors) {
        const authorNames = publication.authors.split(',').map(name => name.trim().toLowerCase());
        const scientistLastName = scientist.lastName?.toLowerCase() || '';
        const scientistFirstName = scientist.firstName?.toLowerCase() || '';
        
        // Check if scientist's name appears in the author list
        return authorNames.some(authorName => {
          // Remove common titles and clean the author name
          const cleanAuthorName = authorName.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '').trim();
          
          // Handle abbreviated names like "Chen E", "Wilson J", "Ahmed S"
          const nameParts = cleanAuthorName.split(/\s+/);
          
          if (nameParts.length >= 2) {
            const [lastPart, firstPart] = nameParts;
            
            // Check if last name matches and first name/initial matches
            if (scientistLastName && scientistFirstName) {
              // Match "LastName FirstInitial" format (e.g., "Chen E")
              if (lastPart === scientistLastName && 
                  firstPart.startsWith(scientistFirstName.charAt(0))) {
                return true;
              }
              
              // Match "FirstInitial LastName" format (e.g., "E Chen")
              if (firstPart === scientistLastName && 
                  lastPart.startsWith(scientistFirstName.charAt(0))) {
                return true;
              }
              
              // Match full names in either order
              if ((lastPart === scientistLastName && firstPart === scientistFirstName) ||
                  (firstPart === scientistLastName && lastPart === scientistFirstName)) {
                return true;
              }
            }
          }
          
          // Fallback: check if last name appears anywhere in the author name
          if (scientistLastName && cleanAuthorName.includes(scientistLastName)) {
            return true;
          }
          
          // Additional check for full name match
          const scientistFullName = scientist.name.toLowerCase().replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');
          return cleanAuthorName.includes(scientistFullName) || scientistFullName.includes(cleanAuthorName);
        });
      }
      
      return true; // If no authors list, show all available scientists
    })
    .sort((a, b) => {
      // Sort alphabetically by last name, ignoring titles
      const getLastName = (scientist: any) => {
        if (scientist.lastName) return scientist.lastName.toLowerCase();
        // Extract last name from full name, ignoring titles
        const nameWithoutTitle = scientist.name.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '');
        const nameParts = nameWithoutTitle.trim().split(/\s+/);
        return nameParts[nameParts.length - 1].toLowerCase();
      };
      
      const lastNameA = getLastName(a);
      const lastNameB = getLastName(b);
      return lastNameA.localeCompare(lastNameB);
    });

  const authorshipTypeColors = {
    'First Author': 'bg-blue-100 text-blue-800',
    'Contributing Author': 'bg-green-100 text-green-800',
    'Senior Author': 'bg-purple-100 text-purple-800',
    'Last Author': 'bg-orange-100 text-orange-800',
    'Corresponding Author': 'bg-red-100 text-red-800',
  };

  const { data: researchActivity, isLoading: researchActivityLoading } = useQuery<ResearchActivity>({
    queryKey: ['/api/research-activities', publication?.researchActivityId],
    queryFn: async () => {
      if (!publication?.researchActivityId) return null;
      const response = await fetch(`/api/research-activities/${publication.researchActivityId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research activity');
      }
      return response.json();
    },
    enabled: !!publication?.researchActivityId,
  });
  
  // Fetch patents related to the same research activity
  const { data: relatedPatents, isLoading: patentsLoading } = useQuery<Patent[]>({
    queryKey: ['/api/patents', publication?.researchActivityId],
    queryFn: async () => {
      if (!publication?.researchActivityId) return [];
      const response = await fetch('/api/patents');
      if (!response.ok) {
        throw new Error('Failed to fetch patents');
      }
      const patents = await response.json();
      return patents.filter(patent => patent.researchActivityId === publication.researchActivityId);
    },
    enabled: !!publication?.researchActivityId,
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  if (publicationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Publication Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The publication you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/publications")}>
                Return to Publications List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">{publication.title}</h1>
        </div>
        <Button 
          className="bg-sidra-teal hover:bg-sidra-teal-dark text-white font-medium px-4 py-2 shadow-sm"
          onClick={() => navigate(`/publications/${publication.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Publication Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{publication.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {researchActivity && (
                    <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                  <Badge className={
                    publication.status === 'published' ? 'bg-green-100 text-green-800' :
                    publication.status === 'in press' ? 'bg-blue-100 text-blue-800' :
                    publication.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {publication.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Related Research Activity</h3>
                  <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    <span>
                      {researchActivityLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : researchActivity ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-primary-600"
                          onClick={() => navigate(`/research-activities/${researchActivity.id}`)}
                        >
                          {researchActivity.title}
                        </Button>
                      ) : 'Not assigned'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Publication Date</h3>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {publication.publicationDate 
                        ? format(new Date(publication.publicationDate), 'MMM d, yyyy') 
                        : 'Not published yet'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Publication Type</h3>
                  <div className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    <span>{publication.publicationType || 'Not specified'}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-400">Authors</h3>
                  <div className="flex items-center gap-1">
                    <span>{publication.authors}</span>
                  </div>
                </div>
              </div>

              {publication.journal && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">Journal</h3>
                  <p className="mt-1">
                    {publication.journal}
                    {publication.volume && (
                      <span>, Vol. {publication.volume}</span>
                    )}
                    {publication.issue && (
                      <span>, No. {publication.issue}</span>
                    )}
                    {publication.pages && (
                      <span>, pp. {publication.pages}</span>
                    )}
                  </p>
                </div>
              )}
              
              {publication.doi && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-neutral-400">DOI</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={`https://doi.org/${publication.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {publication.doi}
                    </a>
                  </div>
                </div>
              )}
              
              {publication.abstract && (
                <div className="mt-6">
                  <h3 className="text-md font-medium border-b pb-2">Abstract</h3>
                  <p className="mt-2">{publication.abstract}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Internal Authors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {authorsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : publicationAuthors.length === 0 ? (
                  <p className="text-neutral-400 text-sm">No internal authors added yet.</p>
                ) : (
                  <div className="space-y-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scientist</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead className="w-[70px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publicationAuthors.map((author) => (
                          <TableRow key={author.id}>
                            <TableCell className="font-medium">
                              {author.scientist.name}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={`${authorshipTypeColors[author.authorshipType as keyof typeof authorshipTypeColors] || 'bg-gray-100 text-gray-800'} text-xs`}
                              >
                                {author.authorshipType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {author.authorPosition || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAuthorMutation.mutate(author.scientistId)}
                                disabled={removeAuthorMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Dialog open={isAddAuthorOpen} onOpenChange={setIsAddAuthorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Internal Author
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Internal Author</DialogTitle>
                      <DialogDescription>
                        Link an internal scientist to this publication and specify their authorship role.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Smart Filtering Active</p>
                          <p className="text-blue-700">
                            Only scientists whose names match the publication's author list are shown, 
                            sorted alphabetically by last name. This works with abbreviated names like "Chen E" or "Wilson J".
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="scientist">Scientist</Label>
                        <Select value={selectedScientist} onValueChange={setSelectedScientist}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a scientist" />
                          </SelectTrigger>
                          <SelectContent>
                            {scientistsLoading ? (
                              <div className="p-2 text-sm text-neutral-400">Loading scientists...</div>
                            ) : availableScientists.length === 0 ? (
                              <div className="p-2 text-sm text-neutral-400">All scientists already added</div>
                            ) : (
                              availableScientists.map((scientist) => (
                                <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                  {scientist.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="role">Authorship Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select authorship type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="First Author">First Author</SelectItem>
                            <SelectItem value="Contributing Author">Contributing Author</SelectItem>
                            <SelectItem value="Senior Author">Senior Author</SelectItem>
                            <SelectItem value="Last Author">Last Author</SelectItem>
                            <SelectItem value="Corresponding Author">Corresponding Author</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="position">Author Position (Optional)</Label>
                        <Input
                          value={authorPosition}
                          onChange={(e) => setAuthorPosition(e.target.value)}
                          placeholder="e.g., 1, 2, 3..."
                          type="number"
                          min="1"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddAuthorOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddAuthor}
                        disabled={addAuthorMutation.isPending || !selectedScientist || !selectedRole}
                      >
                        {addAuthorMutation.isPending ? "Adding..." : "Add Author"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => researchActivity && navigate(`/research-activities/${researchActivity.id}`)}
                  disabled={!researchActivity}
                >
                  <Layers className="h-4 w-4 mr-2" /> 
                  <span className="flex-1 text-left">Research Activity</span>
                  {researchActivity && (
                    <Badge variant="outline" className="ml-2 rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                      {researchActivity.sdrNumber}
                    </Badge>
                  )}
                </Button>
                {relatedPatents && relatedPatents.length > 0 ? (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => {
                      // Use a different approach - open in new tab first while we debug
                      const patentId = relatedPatents[0]?.id;
                      if (patentId) {
                        // Navigate directly to the patent detail page with a delay
                        setTimeout(() => {
                          window.location.href = `/patents/${patentId}`;
                        }, 100);
                      }
                    }}
                  >
                    <Award className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Related Patent</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-amber-50 text-amber-700 border-amber-200">
                      {relatedPatents[0]?.patentNumber || 'Pending'}
                    </Badge>
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => researchActivity && navigate(`/patents?researchActivityId=${researchActivity?.id}`)}
                    disabled={!researchActivity}
                  >
                    <Award className="h-4 w-4 mr-2" /> 
                    <span className="flex-1 text-left">Related Patents</span>
                    <Badge variant="outline" className="ml-2 rounded-sm bg-gray-50 text-gray-700 border-gray-200">
                      0
                    </Badge>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">No documents available.</p>
              <Button variant="outline" className="w-full mt-4" disabled>
                <FileText className="h-4 w-4 mr-2" /> Add Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}