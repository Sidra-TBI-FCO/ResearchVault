import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPublicationSchema, type ResearchActivity } from "@shared/schema";
import { ArrowLeft } from "lucide-react";

// Extend the insert schema with additional validations
const createPublicationSchema = insertPublicationSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  abstract: z.string().optional(),
  authors: z.string().min(3, "Authors field is required"),
  journal: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  doi: z.string().optional(),
  publicationDate: z.string().optional(),
  publicationType: z.string().optional(),
  researchActivityId: z.number().nullable().optional(),
  status: z.string().optional(),
});

type CreatePublicationFormValues = z.infer<typeof createPublicationSchema>;

export default function CreatePublication() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get all research activities for selection
  const { data: researchActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  // Default form values
  const defaultValues: Partial<CreatePublicationFormValues> = {
    status: "Draft",
    publicationType: "Journal Article",
    researchActivityId: null,
  };

  const form = useForm<CreatePublicationFormValues>({
    resolver: zodResolver(createPublicationSchema),
    defaultValues,
  });

  const createPublicationMutation = useMutation({
    mutationFn: async (data: CreatePublicationFormValues) => {
      const response = await apiRequest("POST", "/api/publications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/publications'] });
      toast({
        title: "Publication added",
        description: "The publication has been successfully added to the system.",
      });
      navigate("/publications");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error adding the publication.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePublicationFormValues) => {
    // Convert string date from HTML input to Date object for API
    const submitData = {
      ...data,
      publicationDate: data.publicationDate ? new Date(data.publicationDate) : null,
      researchActivityId: data.researchActivityId || null,
    };
    createPublicationMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/publications")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Add Publication</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publication Information</CardTitle>
          <CardDescription>Enter the details of the research publication</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Publication Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CRISPR-Cas9 Efficiency in Human Cell Lines" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="authors"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
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
                
                <FormField
                  control={form.control}
                  name="abstract"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Abstract</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Publication abstract or summary" 
                          className="resize-none" 
                          rows={4}
                          {...field} 
                        />
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
                      <FormLabel>Journal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Nature Biotechnology" {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
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
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Submitted">Submitted</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Published">Published</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 42" {...field} />
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
                        <Input placeholder="e.g. 3" {...field} />
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
                        <Input placeholder="e.g. 123-135" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="doi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DOI</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 10.1038/nbt.4321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="researchActivityId"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Research Activity (SDR)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                        defaultValue={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a research activity (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {activitiesLoading ? (
                            <SelectItem value="loading" disabled>Loading research activities...</SelectItem>
                          ) : (
                            researchActivities?.map((activity) => (
                              <SelectItem key={activity.id} value={activity.id.toString()}>
                                {activity.sdrNumber} - {activity.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end space-x-2 px-0">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/publications")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPublicationMutation.isPending}
                >
                  {createPublicationMutation.isPending ? 'Saving...' : 'Save Publication'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
