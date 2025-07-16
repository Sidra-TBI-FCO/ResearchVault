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
import { insertIbcApplicationSchema } from "@shared/schema";
import { Scientist, Project, ResearchActivity } from "@shared/schema";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Extend the insert schema with additional validations
const createIbcApplicationSchema = insertIbcApplicationSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  principalInvestigatorId: z.number({
    required_error: "Please select a principal investigator",
  }),
  submissionDate: z.date().optional(),
  approvalDate: z.date().optional(),
  expirationDate: z.date().optional(),
  status: z.string({
    required_error: "Please select a status",
  }),
  protocolNumber: z.string().optional(),
  biosafetyLevel: z.string({
    required_error: "Please select a biosafety level",
  }),
  description: z.string().optional(),
  agents: z.string().optional(),
  researchActivityIds: z.array(z.number()).min(1, "Please select at least one research activity"),
});

type CreateIbcApplicationFormValues = z.infer<typeof createIbcApplicationSchema>;

export default function CreateIbc() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get all principal investigators for selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  // Get all research activities for selection
  const { data: researchActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  // Default form values
  const defaultValues: Partial<CreateIbcApplicationFormValues> = {
    status: "Submitted",
    submissionDate: new Date(),
    biosafetyLevel: "BSL-2",
    researchActivityIds: [],
  };

  const form = useForm<CreateIbcApplicationFormValues>({
    resolver: zodResolver(createIbcApplicationSchema),
    defaultValues,
  });

  const createIbcApplicationMutation = useMutation({
    mutationFn: async (data: CreateIbcApplicationFormValues) => {
      const response = await apiRequest("POST", "/api/ibc-applications", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ibc-applications'] });
      toast({
        title: "IBC Application created",
        description: "The IBC application has been successfully submitted.",
      });
      navigate("/ibc");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the IBC application.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateIbcApplicationFormValues) => {
    createIbcApplicationMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ibc")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">New IBC Application</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IBC Application Information</CardTitle>
          <CardDescription>Enter the details for the Institutional Biosafety Committee application</CardDescription>
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
                      <FormLabel>Application Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Microbiome Sample Analysis Protocol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="researchActivityIds"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Research Activities (SDRs)</FormLabel>
                      <FormDescription>
                        Select one or more research activities that share biosafety protocols
                      </FormDescription>
                      <div className="space-y-2">
                        {activitiesLoading ? (
                          <div className="text-sm text-muted-foreground">Loading research activities...</div>
                        ) : (
                          researchActivities?.map((activity) => (
                            <div key={activity.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`activity-${activity.id}`}
                                checked={field.value?.includes(activity.id) || false}
                                onChange={(e) => {
                                  const currentValue = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValue, activity.id]);
                                  } else {
                                    field.onChange(currentValue.filter(id => id !== activity.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor={`activity-${activity.id}`} className="text-sm cursor-pointer">
                                <span className="font-medium">{activity.sdrNumber}</span> - {activity.title}
                                {activity.status && (
                                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                    activity.status === 'active' ? 'bg-green-100 text-green-800' :
                                    activity.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {activity.status}
                                  </span>
                                )}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
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
                          <SelectItem value="Submitted">Submitted</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Revisions Required">Revisions Required</SelectItem>
                          <SelectItem value="Expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="protocolNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IBC-2023-021" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank if not yet assigned
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="biosafetyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biosafety Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select biosafety level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BSL-1">BSL-1</SelectItem>
                          <SelectItem value="BSL-2">BSL-2</SelectItem>
                          <SelectItem value="BSL-3">BSL-3</SelectItem>
                          <SelectItem value="BSL-4">BSL-4</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the highest biosafety level required for this protocol
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="agents"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Biological Agents</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Human gut bacterial isolates, recombinant DNA, viral vectors" {...field} />
                      </FormControl>
                      <FormDescription>
                        List the biological agents that will be used in this protocol
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="submissionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="approvalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Approval Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Leave blank if not yet approved
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiration Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Set expiration date if known (typically three years after approval)
                      </FormDescription>
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
                          placeholder="Detailed description of the protocol, including procedures, facilities, and safety measures" 
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
                  onClick={() => navigate("/ibc")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createIbcApplicationMutation.isPending}
                >
                  {createIbcApplicationMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
