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
import { Pencil, Save, X, Upload, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { JournalImpactFactor, InsertJournalImpactFactor } from "@shared/schema";

export default function PublicationOffice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertJournalImpactFactor>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const { data: impactFactors, isLoading } = useQuery({
    queryKey: ['/api/journal-impact-factors'],
    select: (data: JournalImpactFactor[]) => {
      let filtered = data;
      
      if (searchTerm) {
        filtered = filtered.filter(factor => 
          factor.journalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          factor.publisher?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (yearFilter) {
        const year = parseInt(yearFilter);
        if (!isNaN(year)) {
          filtered = filtered.filter(factor => factor.year === year);
        }
      }
      
      return filtered;
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading impact factors...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Publication Office - Journal Impact Factors</h1>
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
            Impact Factors ({impactFactors?.length || 0} journals)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journal Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Impact Factor</TableHead>
                  <TableHead>Quartile</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Total Citations</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactFactors?.map((factor) => (
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
                      {editingId === factor.id ? (
                        <Input
                          type="number"
                          value={editForm.year || ''}
                          onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value) })}
                          className="w-20"
                        />
                      ) : (
                        factor.year
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === factor.id ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editForm.impactFactor || ''}
                          onChange={(e) => setEditForm({ ...editForm, impactFactor: parseFloat(e.target.value) })}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-mono">{factor.impactFactor}</span>
                      )}
                    </TableCell>
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
                    <TableCell>
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
                        <Input
                          type="number"
                          value={editForm.totalCitations || ''}
                          onChange={(e) => setEditForm({ ...editForm, totalCitations: parseInt(e.target.value) })}
                          className="w-24"
                        />
                      ) : (
                        factor.totalCitations?.toLocaleString()
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
        </CardContent>
      </Card>
    </div>
  );
}