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
import { insertIrbApplicationSchema } from "@shared/schema";
import { Scientist, ResearchActivity } from "@shared/schema";
import { CalendarIcon, ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Extend the insert schema with additional validations
const createIrbApplicationSchema = insertIrbApplicationSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  researchActivityId: z.number({
    required_error: "Please select a research activity (SDR)",
  }),
  principalInvestigatorId: z.number({
    required_error: "Please select a principal investigator",
  }),

  protocolNumber: z.string().optional(),
  riskLevel: z.string().optional(),
  description: z.string().optional(),
}).omit({
  irbNumber: true, // IRB number will be auto-generated
});

type CreateIrbApplicationFormValues = z.infer<typeof createIrbApplicationSchema>;

export default function CreateIrb() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get all principal investigators for selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  // Default form values
  const defaultValues: Partial<CreateIrbApplicationFormValues> = {
    title: '',
    description: '',
    protocolType: 'observational',
    riskLevel: 'minimal',
    isInterventional: false,
    expectedParticipants: 0,
    vulnerablePopulations: [],
    researchActivityId: undefined,
    principalInvestigatorId: undefined,
  };

  const form = useForm<CreateIrbApplicationFormValues>({
    resolver: zodResolver(createIrbApplicationSchema),
    defaultValues,
  });

  // Get research activities filtered by selected PI
  const selectedPiId = form.watch('principalInvestigatorId');
  const { data: researchActivities, isLoading: researchActivitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities', selectedPiId],
    queryFn: async () => {
      if (!selectedPiId) return [];
      const response = await fetch(`/api/research-activities?principalInvestigatorId=${selectedPiId}`);
      if (!response.ok) throw new Error('Failed to fetch research activities');
      return response.json();
    },
    enabled: !!selectedPiId,
  });

  const createIrbApplicationMutation = useMutation({
    mutationFn: async (data: CreateIrbApplicationFormValues) => {
      const response = await apiRequest("POST", "/api/irb-applications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/irb-applications'] });
      toast({
        title: "IRB Application created",
        description: "The IRB application has been successfully submitted.",
      });
      navigate("/irb");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the IRB application.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateIrbApplicationFormValues) => {
    createIrbApplicationMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/irb")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">New IRB Application</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IRB Application Information</CardTitle>
          <CardDescription>Enter the details for the Institutional Review Board application</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">IRB Application Process</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Start by selecting the Principal Investigator, then choose from their active research activities (SDRs). 
                      Important dates (submission, approval, expiration) are automatically set based on workflow actions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Application Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Human Cell Line Testing for CRISPR Cancer Therapy" {...field} />
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
                      <FormLabel>Research Activity (SDR)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a research activity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {researchActivitiesLoading ? (
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
                
                <FormField
                  control={form.control}
                  name="principalInvestigatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Principal Investigator</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a PI" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {piLoading ? (
                            <SelectItem value="loading" disabled>Loading PIs...</SelectItem>
                          ) : (
                            principalInvestigators?.map((pi) => (
                              <SelectItem key={pi.id} value={pi.id.toString()}>
                                {pi.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                

                

                
                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Minimal">Minimal</SelectItem>
                          <SelectItem value="Greater Than Minimal">Greater Than Minimal</SelectItem>
                          <SelectItem value="High">High</SelectItem>
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
                          placeholder="Detailed description of the human subjects research protocol" 
                          className="resize-none" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end space-x-2 px-0">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/irb")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createIrbApplicationMutation.isPending}
                >
                  {createIrbApplicationMutation.isPending ? 'Creating...' : 'Create Draft'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
