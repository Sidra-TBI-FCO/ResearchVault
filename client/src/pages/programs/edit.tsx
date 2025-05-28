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
import { insertProgramSchema, type InsertProgram, type Program } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";

const categories = [
  "Cancer",
  "Neurological Disorders", 
  "Genetic/Metabolic Disorders",
  "Immune Dysregulations",
  "Reproductive/Pregnancy/Neonatal Disorders",
  "Miscellaneous",
  "Congenital Malformations"
];

export default function ProgramEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: program, isLoading } = useQuery<Program>({
    queryKey: ['/api/programs', id],
    enabled: !!id,
  });

  const form = useForm<InsertProgram>({
    resolver: zodResolver(insertProgramSchema),
    defaultValues: {
      programId: program?.programId || "",
      title: program?.title || "",
      shortTitle: program?.shortTitle || "",
      category: program?.category || "",
      description: program?.description || "",
      objectives: program?.objectives || "",
      status: program?.status || "Active",
      programDirector: program?.programDirector || "",
      researchCoLead: program?.researchCoLead || "",
      clinicalCoLead1: program?.clinicalCoLead1 || "",
      clinicalCoLead2: program?.clinicalCoLead2 || "",
    },
  });

  // Update form when program data loads
  useEffect(() => {
    if (program) {
      form.reset({
        programId: program.programId,
        title: program.title,
        shortTitle: program.shortTitle || "",
        category: program.category,
        description: program.description || "",
        objectives: program.objectives || "", 
        status: program.status,
        programDirector: program.programDirector || "",
        researchCoLead: program.researchCoLead || "",
        clinicalCoLead1: program.clinicalCoLead1 || "",
        clinicalCoLead2: program.clinicalCoLead2 || "",
      });
    }
  }, [program, form]);

  const updateMutation = useMutation({
    mutationFn: (data: InsertProgram) => 
      apiRequest(`/api/programs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/programs', id] });
      navigate(`/programs/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update program",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProgram) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
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

  if (!program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Program Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The program you're trying to edit could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/programs")}>
                Return to Programs List
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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/programs/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Edit Program</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PRM-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Program title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shortTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Short title or abbreviation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="programDirector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Director</FormLabel>
                      <FormControl>
                        <Input placeholder="Program Director name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="researchCoLead"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Research Co-Lead</FormLabel>
                      <FormControl>
                        <Input placeholder="Research Co-Lead name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clinicalCoLead1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Co-Lead 1 (Physician)</FormLabel>
                      <FormControl>
                        <Input placeholder="First Clinical Co-Lead name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicalCoLead2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Co-Lead 2 (Physician)</FormLabel>
                      <FormControl>
                        <Input placeholder="Second Clinical Co-Lead name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Program description..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Program objectives..."
                        className="min-h-[100px]"
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
                  Update Program
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/programs/${id}`)}
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