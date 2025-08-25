import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPublicationSchema, type InsertPublication, type Publication, type ResearchActivity } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import React from "react";

export default function PublicationEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: publication, isLoading } = useQuery<Publication>({
    queryKey: ['/api/publications', id],
    queryFn: () => fetch(`/api/publications/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: researchActivities } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  const editPublicationSchema = insertPublicationSchema.extend({
    researchActivityId: z.number().min(1, "Research Activity (SDR) is required"),
  });

  const form = useForm<InsertPublication>({
    resolver: zodResolver(editPublicationSchema),
    defaultValues: {
      researchActivityId: publication?.researchActivityId || undefined,
      title: publication?.title || "",
      authors: publication?.authors || "",
      journal: publication?.journal || "",
      volume: publication?.volume || "",
      issue: publication?.issue || "",
      pages: publication?.pages || "",
      publicationDate: publication?.publicationDate ? new Date(publication.publicationDate).toISOString().split('T')[0] : undefined,
      doi: publication?.doi || "",
      abstract: publication?.abstract || "",
      publicationType: publication?.publicationType || "Journal Article",
    },
  });

  // Update form when publication data loads
  React.useEffect(() => {
    if (publication) {
      form.reset({
        researchActivityId: publication.researchActivityId,
        title: publication.title,
        authors: publication.authors || "",
        journal: publication.journal || "",
        volume: publication.volume || "",
        issue: publication.issue || "",
        pages: publication.pages || "",
        publicationDate: publication.publicationDate ? new Date(publication.publicationDate).toISOString().split('T')[0] : undefined,
        doi: publication.doi || "",
        abstract: publication.abstract || "",
        publicationType: publication.publicationType || "Journal Article",
      });
    }
  }, [publication, form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('PATCH', `/api/publications/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Publication updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      queryClient.invalidateQueries({ queryKey: [`/api/publications/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/publications/${id}/authors`] });
      navigate(`/publications/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update publication",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Convert string date from HTML input to Date object for API
    const submitData = {
      ...data,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
      researchActivityId: data.researchActivityId || null,
    };
    updateMutation.mutate(submitData);
  };

  if (isLoading) {
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
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
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
              <p className="text-lg text-neutral-400">The publication you're trying to edit could not be found.</p>
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/publications/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Edit Publication</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publication Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Publication title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="researchActivityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Activity (SDR) *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a research activity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {researchActivities?.map((activity) => (
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
                name="authors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authors</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List of authors (e.g., Smith J, Doe A, Johnson B)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="journal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Journal</FormLabel>
                      <FormControl>
                        <Input placeholder="Journal name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publicationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume</FormLabel>
                      <FormControl>
                        <Input placeholder="Volume number" {...field} />
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
                        <Input placeholder="Issue number" {...field} />
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
                        <Input placeholder="e.g., 123-130" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="doi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DOI</FormLabel>
                    <FormControl>
                      <Input placeholder="Digital Object Identifier" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publicationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select publication type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Journal Article">Journal Article</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Conference Paper">Conference Paper</SelectItem>
                        <SelectItem value="Book Chapter">Book Chapter</SelectItem>
                        <SelectItem value="Editorial">Editorial</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="Case Report">Case Report</SelectItem>
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
                      <Textarea 
                        placeholder="Publication abstract..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-sidra-teal hover:bg-sidra-teal-dark text-white"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Publication
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/publications/${id}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}