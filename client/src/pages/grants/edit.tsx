import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { formatFullName } from "@/utils/nameUtils";
import { insertGrantSchema, type InsertGrant } from "@shared/schema";

type UpdateGrantForm = Partial<InsertGrant> & {
  id: number;
};

export default function EditGrant() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/grants/:id/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collaboratorsInput, setCollaboratorsInput] = useState("");
  const [linkedSdrs, setLinkedSdrs] = useState<number[]>([]);

  const grantId = params?.id ? parseInt(params.id) : null;

  const form = useForm<UpdateGrantForm>({
    resolver: zodResolver(insertGrantSchema.partial()),
    defaultValues: {
      projectNumber: "",
      title: "",
      description: "",
      cycle: "",
      status: "pending",
      fundingAgency: "",
      investigatorType: "Researcher",
      lpiId: undefined,
      requestedAmount: "",
      awardedAmount: "",
      submittedYear: undefined,
      awardedYear: undefined,
      awarded: false,
      runningTimeYears: undefined,
      currentGrantYear: undefined,
      startDate: "",
      endDate: "",
      collaborators: [],
    },
  });

  const { data: grant, isLoading: isLoadingGrant } = useQuery({
    queryKey: ['/api/grants', grantId],
    enabled: !!grantId,
  });

  const { data: scientists = [] } = useQuery({
    queryKey: ['/api/scientists']
  });

  const { data: researchActivities = [] } = useQuery({
    queryKey: ['/api/research-activities']
  });

  const { data: grantSdrs = [] } = useQuery({
    queryKey: [`/api/grants/${grantId}/research-activities`],
    enabled: !!grantId,
  });

  useEffect(() => {
    if (grant && grant.id) {
      const collaboratorsText = Array.isArray(grant.collaborators) 
        ? grant.collaborators.join('\n')
        : '';
      setCollaboratorsInput(collaboratorsText);

      form.reset({
        projectNumber: grant.projectNumber ?? "",
        title: grant.title ?? "",
        description: grant.description ?? "",
        cycle: grant.cycle ?? "",
        status: grant.status ?? "pending",
        fundingAgency: grant.fundingAgency ?? "",
        investigatorType: grant.investigatorType ?? "Researcher",
        lpiId: grant.lpiId ?? undefined,
        requestedAmount: grant.requestedAmount ?? "",
        awardedAmount: grant.awardedAmount ?? "",
        submittedYear: grant.submittedYear ?? undefined,
        awardedYear: grant.awardedYear ?? undefined,
        awarded: grant.awarded ?? false,
        runningTimeYears: grant.runningTimeYears ?? undefined,
        currentGrantYear: grant.currentGrantYear ?? undefined,
        startDate: grant.startDate ? grant.startDate.split('T')[0] : "",
        endDate: grant.endDate ? grant.endDate.split('T')[0] : "",
        collaborators: grant.collaborators ?? [],
      });
    }
  }, [grant?.id]);

  useEffect(() => {
    if (grantSdrs) {
      setLinkedSdrs(grantSdrs.map((sdr: any) => sdr.id));
    }
  }, [grantSdrs]);

  const updateGrantMutation = useMutation({
    mutationFn: async (data: UpdateGrantForm) => {
      const collaborators = collaboratorsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const payload = { ...data, collaborators };
      const response = await fetch(`/api/grants/${grantId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Failed to update grant');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/grants', grantId] });
      toast({
        title: "Success",
        description: "Grant updated successfully",
      });
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

  const handleSdrToggle = async (sdrId: number, isLinked: boolean) => {
    try {
      if (isLinked) {
        const response = await fetch(`/api/grants/${grantId}/research-activities/${sdrId}`, {
          method: "POST",
        });
        if (!response.ok) throw new Error('Failed to link SDR');
        setLinkedSdrs(prev => [...prev, sdrId]);
        toast({ title: "Success", description: "SDR linked to grant successfully" });
      } else {
        const response = await fetch(`/api/grants/${grantId}/research-activities/${sdrId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error('Failed to unlink SDR');
        setLinkedSdrs(prev => prev.filter(id => id !== sdrId));
        toast({ title: "Success", description: "SDR unlinked from grant successfully" });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${grantId}/research-activities`] });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: isLinked ? "Failed to link SDR" : "Failed to unlink SDR", 
        variant: "destructive" 
      });
    }
  };

  const handleSubmit = (data: UpdateGrantForm) => {
    updateGrantMutation.mutate({ ...data, id: grantId! });
  };

  if (!grantId) {
    return <div>Invalid grant ID</div>;
  }

  if (isLoadingGrant) {
    return <div>Loading...</div>;
  }

  if (!grant) {
    return <div>Grant not found</div>;
  }

  return (
    <div className="py-6">
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

      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Main Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Grant Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <Input {...field} placeholder="e.g., 2024-1" value={field.value ?? ""} />
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
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
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
                </div>

                <div className="mt-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="fundingAgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Agency</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., NIH, NSF, KSAS" value={field.value ?? ""} />
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
                            value={field.value ?? ""}
                            className="flex flex-row space-x-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Researcher" id="researcher" />
                              <Label htmlFor="researcher">Researcher</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Clinician" id="clinician" />
                              <Label htmlFor="clinician">Clinician</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="lpiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Principal Investigator (LPI)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select LPI" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {scientists
                              .filter((scientist: any) => scientist.staffType === 'scientific')
                              .map((scientist: any) => (
                              <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                {formatFullName(scientist)} - {scientist.jobTitle || 'No title'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
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
                            rows={2}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial & Timeline Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              value={field.value ?? ""} 
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
                              value={field.value ?? ""} 
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
                  <CardTitle>Timeline & Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
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
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="runningTimeYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Years)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="3"
                              value={field.value ?? ""} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentGrantYear"
                      render={({ field }) => {
                        const runningTimeYears = form.watch("runningTimeYears");
                        const yearOptions = runningTimeYears ? Array.from({ length: runningTimeYears }, (_, i) => i + 1) : [];
                        
                        return (
                          <FormItem>
                            <FormLabel>Current Year</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={runningTimeYears ? "Year" : "Set duration"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOptions.map((year) => (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="awarded"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Grant Awarded</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* SDR Linking Section - Only show when grant is awarded */}
                  {form.watch("awarded") && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-lg font-medium mb-4">Linked Research Activities (SDRs)</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {researchActivities.length > 0 ? (
                          researchActivities.map((sdr: any) => {
                            const isLinked = linkedSdrs.includes(sdr.id);
                            return (
                              <div key={sdr.id} className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={isLinked}
                                  onChange={(e) => handleSdrToggle(sdr.id, e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{sdr.sdrNumber}</div>
                                  <div className="text-sm text-gray-500 truncate">{sdr.title}</div>
                                  <div className="text-xs text-gray-400">{sdr.status}</div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500 text-sm">No research activities available to link.</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Grant Dates & Collaborators */}
            <Card>
              <CardHeader>
                <CardTitle>Grant Dates & Collaborators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                
                <div>
                  <label htmlFor="collaborators" className="text-sm font-medium text-gray-700 mb-2 block">
                    Collaborators (one per line)
                  </label>
                  <Textarea
                    id="collaborators"
                    value={collaboratorsInput}
                    onChange={(e) => setCollaboratorsInput(e.target.value)}
                    placeholder="Dr. John Smith, University of Example&#10;Dr. Jane Doe, Research Institute&#10;..."
                    rows={3}
                    className="w-full"
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