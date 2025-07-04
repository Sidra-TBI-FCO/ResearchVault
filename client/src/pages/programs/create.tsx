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
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProgramSchema } from "@shared/schema";
import { ArrowLeft } from "lucide-react";

// Extend the insert schema with additional validations
const createProgramSchema = insertProgramSchema.extend({
  name: z.string().min(3, "Program name must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string({
    required_error: "Please select a program category",
  }),
  programDirector: z.string().min(2, "Program Director is required"),
  researchCoLead: z.string().min(2, "Research Co-Lead is required"),
  clinicalCoLead1: z.string().min(2, "Clinical Co-Lead 1 is required"),
  clinicalCoLead2: z.string().min(2, "Clinical Co-Lead 2 is required"),
});

type CreateProgramFormValues = z.infer<typeof createProgramSchema>;

export default function CreateProgram() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Default form values
  const defaultValues: Partial<CreateProgramFormValues> = {
    category: "Cancer",
  };

  const form = useForm<CreateProgramFormValues>({
    resolver: zodResolver(createProgramSchema),
    defaultValues,
  });

  const createProgramMutation = useMutation({
    mutationFn: async (data: CreateProgramFormValues) => {
      const response = await apiRequest("POST", "/api/programs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({
        title: "Program created",
        description: "The research program has been successfully created.",
      });
      navigate("/programs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the program.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateProgramFormValues) => {
    createProgramMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/programs")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Create Research Program</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Information</CardTitle>
          <CardDescription>Enter the details for the new research program</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Program Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Cancer Research Initiative" {...field} />
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
                      <FormLabel>Program Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cancer">Cancer</SelectItem>
                          <SelectItem value="Neurological Disorders">Neurological Disorders</SelectItem>
                          <SelectItem value="Genetic/Metabolic Disorders">Genetic/Metabolic Disorders</SelectItem>
                          <SelectItem value="Immune Dysregulations">Immune Dysregulations</SelectItem>
                          <SelectItem value="Reproductive/Pregnancy/Neonatal Disorders">Reproductive/Pregnancy/Neonatal Disorders</SelectItem>
                          <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                          <SelectItem value="Congenital Malformations">Congenital Malformations</SelectItem>
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
                    <FormItem className="col-span-full">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the research program" 
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
                  name="programDirector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Director</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dr. Sarah Johnson" {...field} />
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
                        <Input placeholder="e.g. Dr. Michael Chen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clinicalCoLead1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinical Co-Lead 1</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dr. Emily Rodriguez" {...field} />
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
                      <FormLabel>Clinical Co-Lead 2</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dr. Ahmed Hassan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end space-x-2 px-0">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/programs")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProgramMutation.isPending}
                >
                  {createProgramMutation.isPending ? 'Creating...' : 'Create Program'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}