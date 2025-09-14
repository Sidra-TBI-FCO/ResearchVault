import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertResearchContractSchema, insertResearchContractScopeItemSchema, insertResearchContractExtensionSchema, type InsertResearchContract, type ResearchContract, type ResearchActivity, type ResearchContractScopeItem, type ResearchContractExtension } from "@shared/schema";
import { ArrowLeft, Loader2, Plus, Minus, CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import React from "react";

// Extended schema for contract edit with scope items
const scopeItemSchema = insertResearchContractScopeItemSchema.extend({
  party: z.enum(["sidra", "counterparty"], {
    required_error: "Please select the responsible party",
  }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  dueDate: z.date().optional(),
  acceptanceCriteria: z.string().optional(),
  position: z.number().default(0),
}).omit({
  contractId: true, // Will be set from parent contract
});

// Extended schema for contract extensions  
const extensionSchema = insertResearchContractExtensionSchema.extend({
  newEndDate: z.date({
    required_error: "New end date is required",
  }),
  notes: z.string().optional(),
  sequenceNumber: z.number().default(1),
}).omit({
  contractId: true, // Will be set from parent contract
  requestedAt: true, // Set automatically
  approvedAt: true, // Set automatically
});

// Define a custom schema that includes proper handling for date fields, scope items, and extensions
const contractEditSchema = insertResearchContractSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  scopeItems: z.array(scopeItemSchema).optional(),
  extensions: z.array(extensionSchema).optional(),
});

type ContractEditFormValues = z.infer<typeof contractEditSchema>;

export default function ResearchContractEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery<ResearchContract>({
    queryKey: ['/api/research-contracts', id],
    queryFn: () => fetch(`/api/research-contracts/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  const { data: researchActivities } = useQuery<ResearchActivity[]>({
    queryKey: ['/api/research-activities'],
  });

  // Get scope items for this contract
  const { data: scopeItems, isLoading: scopeItemsLoading } = useQuery<ResearchContractScopeItem[]>({
    queryKey: ['/api/research-contracts', id, 'scope-items'],
    queryFn: () => fetch(`/api/research-contracts/${id}/scope-items`).then(res => res.json()),
    enabled: !!id,
  });

  // Get extensions for this contract
  const { data: extensions, isLoading: extensionsLoading } = useQuery<ResearchContractExtension[]>({
    queryKey: ['/api/research-contracts', id, 'extensions'],
    queryFn: () => fetch(`/api/research-contracts/${id}/extensions`).then(res => res.json()),
    enabled: !!id,
  });

  const form = useForm<ContractEditFormValues>({
    resolver: zodResolver(contractEditSchema),
    defaultValues: {
      researchActivityId: 0,
      contractNumber: "",
      title: "",
      contractorName: "",
      startDate: "",
      endDate: "",
      internalCostSidra: 0,
      internalCostCounterparty: 0,
      moneyOut: 0,
      remarks: "",
      status: "submitted",
      contractType: "Service Agreement",
      scopeItems: [{
        party: "sidra",
        description: "",
        dueDate: undefined,
        acceptanceCriteria: "",
        position: 0,
      }],
      extensions: [],
    },
  });

  // Update form when contract, scope items, and extensions data loads
  React.useEffect(() => {
    if (contract && scopeItems !== undefined && extensions !== undefined) {
      const formattedScopeItems = scopeItems.map(item => ({
        party: item.party as "sidra" | "counterparty",
        description: item.description,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        acceptanceCriteria: item.acceptanceCriteria || "",
        position: item.position,
      }));

      const formattedExtensions = extensions.map(extension => ({
        newEndDate: new Date(extension.newEndDate),
        notes: extension.notes || "",
        sequenceNumber: extension.sequenceNumber,
      }));
      
      form.reset({
        researchActivityId: contract.researchActivityId || 0,
        contractNumber: contract.contractNumber || "",
        title: contract.title || "",
        contractorName: contract.contractorName || "",
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : "",
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
        internalCostSidra: contract.internalCostSidra || 0,
        internalCostCounterparty: contract.internalCostCounterparty || 0,
        moneyOut: contract.moneyOut || 0,
        remarks: contract.remarks || "",
        status: contract.status || "submitted",
        contractType: contract.contractType || "Service Agreement",
        scopeItems: formattedScopeItems.length > 0 ? formattedScopeItems : [{
          party: "sidra",
          description: "",
          dueDate: undefined,
          acceptanceCriteria: "",
          position: 0,
        }],
        extensions: formattedExtensions,
      });
    }
  }, [contract, scopeItems, extensions, form]);

  // Scope items field array management
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "scopeItems",
  });

  const addScopeItem = () => {
    append({
      party: "sidra",
      description: "",
      dueDate: undefined,
      acceptanceCriteria: "",
      position: fields.length,
    });
  };

  // Extensions field array management
  const { fields: extensionFields, append: appendExtension, remove: removeExtension } = useFieldArray({
    control: form.control,
    name: "extensions",
  });

  const addExtension = () => {
    appendExtension({
      newEndDate: new Date(),
      notes: "",
      sequenceNumber: extensionFields.length + 1,
    });
  };

  const removeScopeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: "Cannot remove",
        description: "At least one scope item is required.",
        variant: "destructive",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: ContractEditFormValues) => {
      // Separate scope items and extensions from contract data
      const { scopeItems, extensions, ...contractData } = data;
      
      // Update the contract first
      const contractResponse = await apiRequest("PATCH", `/api/research-contracts/${id}`, {
        ...contractData,
        startDate: contractData.startDate ? contractData.startDate : null,
        endDate: contractData.endDate ? contractData.endDate : null,
      });
      
      // Handle scope items updates
      if (scopeItems && scopeItems.length > 0) {
        // Get current scope items to determine what needs to be updated/deleted
        const currentScopeItems = scopeItems || [];
        
        // For simplicity, we'll delete all existing scope items and recreate them
        // This ensures data consistency (alternative would be complex diff logic)
        
        // Delete existing scope items
        if (scopeItems.length > 0) {
          try {
            // Get existing items first
            const existingResponse = await fetch(`/api/research-contracts/${id}/scope-items`);
            if (existingResponse.ok) {
              const existingItems = await existingResponse.json();
              
              // Delete each existing item
              for (const item of existingItems) {
                await apiRequest("DELETE", `/api/research-contracts/scope-items/${item.id}`);
              }
            }
          } catch (error) {
            console.warn("Error deleting existing scope items:", error);
          }
        }
        
        // Create new scope items
        for (let i = 0; i < currentScopeItems.length; i++) {
          const item = currentScopeItems[i];
          await apiRequest("POST", `/api/research-contracts/${id}/scope-items`, {
            party: item.party,
            description: item.description,
            dueDate: item.dueDate || null,
            acceptanceCriteria: item.acceptanceCriteria || null,
            position: i,
          });
        }
      }

      // Handle extensions updates - always delete existing extensions first, then recreate from form data
      try {
        // Always fetch and delete existing extensions regardless of new array length
        const existingExtensionsResponse = await fetch(`/api/research-contracts/${id}/extensions`);
        if (existingExtensionsResponse.ok) {
          const existingExtensions = await existingExtensionsResponse.json();
          
          // Delete each existing extension
          for (const extension of existingExtensions) {
            await apiRequest("DELETE", `/api/research-contracts/extensions/${extension.id}`);
          }
        }
      } catch (error) {
        console.warn("Error deleting existing extensions:", error);
      }

      // Create new extensions if any exist in the form
      if (extensions && extensions.length > 0) {
        for (let i = 0; i < extensions.length; i++) {
          const extension = extensions[i];
          await apiRequest("POST", `/api/research-contracts/${id}/extensions`, {
            newEndDate: extension.newEndDate.toISOString().split('T')[0],
            notes: extension.notes || null,
            sequenceNumber: i + 1,
            // Remove server-managed fields - let server assign requestedAt and approvedAt
          });
        }
      }
      
      return contractResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Research contract, scope items, and extensions updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/research-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/research-contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/research-contracts', id, 'scope-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/research-contracts', id, 'extensions'] });
      navigate(`/research-contracts/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update research contract",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractEditFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading || scopeItemsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-contracts")}>
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

  if (!contract) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/research-contracts")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Research Contract Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The research contract you're trying to edit could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/research-contracts")}>
                Return to Research Contracts List
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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/research-contracts/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Edit Research Contract</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Research Contract Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="researchActivityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Activity (SDR)</FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contractNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CONTRACT-001" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Service Agreement">Service Agreement</SelectItem>
                          <SelectItem value="Research Collaboration">Research Collaboration</SelectItem>
                          <SelectItem value="Data Sharing Agreement">Data Sharing Agreement</SelectItem>
                          <SelectItem value="Material Transfer Agreement">Material Transfer Agreement</SelectItem>
                          <SelectItem value="Consulting Agreement">Consulting Agreement</SelectItem>
                          <SelectItem value="Licensing Agreement">Licensing Agreement</SelectItem>
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
                      <Input placeholder="Contract title" {...field} />
                    </FormControl>
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
                      <Input placeholder="Organization or individual name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="internalCostSidra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Cost Sidra (QAR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internalCostCounterparty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Cost Counterparty (QAR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moneyOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Money Out (QAR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
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
                    <Select onValueChange={field.onChange} value={field.value || "submitted"}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes, deliverables, or description..."
                        className="min-h-[150px]"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scope of Work Section */}
              <div className="space-y-6 mt-8">
                <div className="border-t pt-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium">Scope of Work</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Define deliverables and responsibilities for both parties
                    </p>
                  </div>
                  <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Responsible Party</TableHead>
                        <TableHead className="w-[300px]">Deliverable Description</TableHead>
                        <TableHead className="w-[140px]">Due Date</TableHead>
                        <TableHead className="w-[200px]">Acceptance Criteria</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`scopeItems.${index}.party`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-party-${index}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="sidra">Sidra</SelectItem>
                                      <SelectItem value="counterparty">Counterparty</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`scopeItems.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Describe the deliverable..."
                                      className="resize-none"
                                      rows={2}
                                      {...field}
                                      data-testid={`textarea-description-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`scopeItems.${index}.dueDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-full justify-start text-left font-normal h-9",
                                            !field.value && "text-muted-foreground"
                                          )}
                                          data-testid={`button-due-date-${index}`}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {field.value ? (
                                            format(field.value, "PP")
                                          ) : (
                                            <span>Pick date</span>
                                          )}
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={4}>
                                      <DatePickerCalendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                        className="rounded-md border"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`scopeItems.${index}.acceptanceCriteria`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Textarea
                                      placeholder="How will completion be measured?"
                                      className="resize-none"
                                      rows={2}
                                      {...field}
                                      data-testid={`textarea-criteria-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeScopeItem(index)}
                              disabled={fields.length === 1}
                              data-testid={`button-remove-scope-${index}`}
                              type="button"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addScopeItem}
                  className="w-full"
                  data-testid="button-add-scope-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scope Item
                </Button>

                    {form.formState.errors.scopeItems?.root && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.scopeItems.root.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contract Extensions Section */}
              <div className="space-y-6 mt-8">
                <div className="border-t pt-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium">Contract Extensions</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage contract extensions and their details
                    </p>
                  </div>
                  <div className="space-y-4">
                    {extensionFields.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Extension #</TableHead>
                              <TableHead className="w-[180px]">New End Date</TableHead>
                              <TableHead className="w-[300px]">Notes</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {extensionFields.map((field, index) => (
                              <TableRow key={field.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                      #{index + 1}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`extensions.${index}.newEndDate`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-col">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <FormControl>
                                              <Button
                                                variant={"outline"}
                                                className={cn(
                                                  "w-full pl-3 text-left font-normal",
                                                  !field.value && "text-muted-foreground"
                                                )}
                                                data-testid={`button-extension-date-${index}`}
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
                                            <DatePickerCalendar
                                              mode="single"
                                              selected={field.value}
                                              onSelect={field.onChange}
                                              disabled={(date) =>
                                                date < new Date("1900-01-01")
                                              }
                                              initialFocus
                                            />
                                          </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`extensions.${index}.notes`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Extension notes or reason..."
                                            className="resize-none"
                                            rows={2}
                                            data-testid={`textarea-extension-notes-${index}`}
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeExtension(index)}
                                    data-testid={`button-remove-extension-${index}`}
                                    type="button"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-md bg-neutral-50">
                        <p className="text-neutral-400">No extensions added yet.</p>
                        <p className="text-sm text-neutral-300 mt-1">Click "Add Extension" to create the first extension.</p>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addExtension}
                      className="w-full"
                      data-testid="button-add-extension"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Extension
                    </Button>

                    {form.formState.errors.extensions?.root && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.extensions.root.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="bg-sidra-teal hover:bg-sidra-teal-dark text-white"
                  data-testid="button-submit"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Research Contract
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/research-contracts/${id}`)}
                  data-testid="button-cancel"
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