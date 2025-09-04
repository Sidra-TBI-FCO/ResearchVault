import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertGrantSchema, type Grant, type Scientist } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

const editGrantSchema = insertGrantSchema.extend({
  investigatorId: z.coerce.number().optional(),
  investigatorType: z.enum(["lpi", "researcher"]).optional(),
  requestedAmount: z.string().optional(),
  awardedAmount: z.string().optional(),
  submittedYear: z.coerce.number().optional(),
  awardedYear: z.coerce.number().optional(),
  currentYear: z.coerce.number().optional(),
  collaborators: z.array(z.string()).optional(),
});

type EditGrantForm = z.infer<typeof editGrantSchema>;

export default function EditGrant() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [collaboratorsInput, setCollaboratorsInput] = useState("");
  const id = parseInt(params.id);

  const { data: grant, isLoading: grantLoading } = useQuery<Grant>({
    queryKey: [`/api/grants/${id}`],
    enabled: !!id,
  });

  const { data: scientists = [] } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  const form = useForm<EditGrantForm>({
    resolver: zodResolver(editGrantSchema),
    defaultValues: {
      projectNumber: "",
      title: "",
      cycle: "",
      status: "submitted",
      description: "",
      fundingAgency: "",
      collaborators: [],
      investigatorType: "lpi",
    },
  });

  // Update form when grant data is loaded
  useEffect(() => {
    if (grant) {
      // Determine investigator type and ID based on existing data
      const investigatorType = grant.lpiId ? "lpi" : grant.researcherId ? "researcher" : "lpi";
      const investigatorId = grant.lpiId || grant.researcherId;

      form.reset({
        projectNumber: grant.projectNumber,
        title: grant.title,
        cycle: grant.cycle || "",
        status: grant.status,
        description: grant.description || "",
        fundingAgency: grant.fundingAgency || "",
        investigatorType,
        investigatorId,
        requestedAmount: grant.requestedAmount?.toString() || "",
        awardedAmount: grant.awardedAmount?.toString() || "",
        submittedYear: grant.submittedYear || undefined,
        awardedYear: grant.awardedYear || undefined,
        currentYear: grant.currentYear || undefined,
        startDate: grant.startDate || "",
        endDate: grant.endDate || "",
      });

      // Set collaborators input
      if (grant.collaborators) {
        setCollaboratorsInput(grant.collaborators.join('\n'));
      }
    }
  }, [grant, form]);

  const updateGrantMutation = useMutation({
    mutationFn: async (data: EditGrantForm) => {
      // Process collaborators from textarea
      const collaborators = collaboratorsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const grantData = {
        ...data,
        collaborators,
        requestedAmount: data.requestedAmount ? parseFloat(data.requestedAmount) : undefined,
        awardedAmount: data.awardedAmount ? parseFloat(data.awardedAmount) : undefined,
        // Map investigator based on type
        lpiId: data.investigatorType === "lpi" ? data.investigatorId : undefined,
        researcherId: data.investigatorType === "researcher" ? data.investigatorId : undefined,
      };

      return apiRequest(`/api/grants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(grantData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      toast({ title: "Success", description: "Grant updated successfully" });
      navigate("/grants");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update grant", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: EditGrantForm) => {
    updateGrantMutation.mutate(data);
  };

  if (grantLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Grant not found</h1>
          <Button onClick={() => navigate("/grants")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/grants")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grants
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Grant</h1>
        <p className="text-gray-600 mt-1">Update grant information</p>
      </div>

      <div className="max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Grant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="projectNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., ARG01-0567-24MHS" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grant Cycle</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 2024-1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="investigatorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investigator Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-row space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="lpi" id="lpi" />
                              <Label htmlFor="lpi">LPI</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="researcher" id="researcher" />
                              <Label htmlFor="researcher">Researcher/Clinician</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="investigatorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("investigatorType") === "lpi" ? "Lead Principal Investigator" : "Researcher/Clinician"}
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${form.watch("investigatorType") === "lpi" ? "LPI" : "researcher"}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {scientists.map((scientist) => (
                              <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                {scientist.honorificTitle} {scientist.firstName} {scientist.lastName}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fundingAgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Agency</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., NIH, NSF, KSAS" />
                        </FormControl>
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
                      <FormLabel>Grant Title *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter the grant title" />
                      </FormControl>
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
                          {...field} 
                          placeholder="Brief description of the grant objectives and scope"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="requestedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Amount</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="awardedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Awarded Amount</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="submittedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submitted Year</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="2024" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="awardedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Awarded Year</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="2024" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Year</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="2024" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date" 
                          />
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
                          <Input 
                            {...field} 
                            type="date" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collaborators</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label htmlFor="collaborators" className="text-sm font-medium text-gray-700 mb-2 block">
                    Collaborators (one per line)
                  </label>
                  <Textarea
                    id="collaborators"
                    value={collaboratorsInput}
                    onChange={(e) => setCollaboratorsInput(e.target.value)}
                    placeholder="Dr. John Smith, University of Example&#10;Dr. Jane Doe, Research Institute&#10;..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/grants")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateGrantMutation.isPending}
              >
                {updateGrantMutation.isPending ? "Updating..." : "Update Grant"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}