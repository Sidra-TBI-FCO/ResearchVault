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
import { insertResearchContractSchema } from "@shared/schema";
import { Scientist, ResearchActivity } from "@shared/schema";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionWrapper } from "@/components/PermissionWrapper";

// Enhanced schema matching the current database model
const createResearchContractSchema = insertResearchContractSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters"),
  contractNumber: z.string().min(3, "Contract number is required"),
  contractorName: z.string().min(2, "Contractor name is required"),
  researchActivityId: z.number({
    required_error: "Please select a research activity",
  }).nullable().optional(),
  leadPIId: z.number({
    required_error: "Please select a lead PI",
  }).nullable().optional(),
  contractType: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  contractValue: z.number().min(0, "Contract value must be positive").optional(),
  currency: z.string().default("QAR"),
  fundingSourceCategory: z.string().optional(),
  status: z.enum(["submitted", "under_review", "active", "completed", "terminated", "expired"], {
    required_error: "Please select a status",
  }),
  description: z.string().optional(),
  requestedByUserId: z.number().optional(),
});

type CreateResearchContractFormValues = z.infer<typeof createResearchContractSchema>;

export default function CreateContract() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  
  // Get all principal investigators for selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  // Get all research activities for selection
  const { data: researchActivities, isLoading: activitiesLoading } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  // Default form values for enhanced schema
  const defaultValues: Partial<CreateResearchContractFormValues> = {
    status: "submitted",
    startDate: new Date(),
    contractType: "Collaboration",
    currency: "QAR",
    leadPIId: null,
    researchActivityId: null,
    requestedByUserId: currentUser.id,
  };

  const form = useForm<CreateResearchContractFormValues>({
    resolver: zodResolver(createResearchContractSchema),
    defaultValues,
  });

  const createResearchContractMutation = useMutation({
    mutationFn: async (data: CreateResearchContractFormValues) => {
      const response = await apiRequest("POST", "/api/research-contracts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research-contracts'] });
      toast({
        title: "Contract created",
        description: "The research contract has been successfully created.",
      });
      navigate("/contracts");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the contract.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateResearchContractFormValues) => {
    createResearchContractMutation.mutate(data);
  };

  return (
    <PermissionWrapper 
      currentUserRole={currentUser.role} 
      navigationItem="contracts"
      showReadOnlyBanner={true}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">New Research Contract</h1>
        </div>

        {/* Contract Officer Notice */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">
                  Contract Officer Access Only
                </h3>
                <p className="text-orange-700 mb-3">
                  This form is exclusively for Contract Officers and Management to create contracts directly in the system.
                  It bypasses the normal contract request and approval process.
                </p>
                <div className="text-sm text-orange-600">
                  <p><strong>Regular users should use:</strong> "Request New Contract" button to submit requests through proper channels.</p>
                  <p><strong>This form should only be used when:</strong> Creating pre-approved contracts or when authorized to bypass standard workflow.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
          <CardDescription>Enter the details for the new research contract</CardDescription>
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
                      <FormLabel>Contract Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Pharmaceutical Development Partnership" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CNT-2025-001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique contract identifier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contractor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Novagen Therapeutics" {...field} />
                      </FormControl>
                      <FormDescription>
                        External organization or entity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="researchActivityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Research Activity (SDR)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                        defaultValue={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a research activity" />
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
                      <FormDescription>
                        Optional: Link to an existing research activity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="leadPIId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Principal Investigator</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                        defaultValue={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Lead PI" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {piLoading ? (
                            <SelectItem value="loading" disabled>Loading PIs...</SelectItem>
                          ) : (
                            principalInvestigators?.map((pi) => (
                              <SelectItem key={pi.id} value={pi.id.toString()}>
                                {pi.firstName} {pi.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Primary PI responsible for this contract
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
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
                          <SelectItem value="Collaboration">Collaboration</SelectItem>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="Material Transfer">Material Transfer</SelectItem>
                          <SelectItem value="Confidentiality">Confidentiality</SelectItem>
                          <SelectItem value="License">License</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
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
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Current contract workflow status
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="750000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          value={field.value?.toString() || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Total financial value (numeric)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="QAR">QAR (Qatari Riyal)</SelectItem>
                          <SelectItem value="USD">USD (US Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fundingSourceCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Source Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select funding source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="QNRF">QNRF</SelectItem>
                          <SelectItem value="PI Fund">PI Fund</SelectItem>
                          <SelectItem value="IRF Fund">IRF Fund</SelectItem>
                          <SelectItem value="External">External</SelectItem>
                          <SelectItem value="Industry">Industry</SelectItem>
                          <SelectItem value="Government">Government</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Source of funding for this contract
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
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
                        The date when the contract is scheduled to expire
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
                          placeholder="Detailed description of the contract, including scope of work, deliverables, and terms" 
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
                  onClick={() => navigate("/contracts")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createResearchContractMutation.isPending}
                >
                  {createResearchContractMutation.isPending ? 'Creating...' : 'Create Contract'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </PermissionWrapper>
  );
}
