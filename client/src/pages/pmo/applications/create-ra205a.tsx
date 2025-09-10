import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema for RA-205A
const ra205aFormSchema = z.object({
  selectedSdrId: z.number({ required_error: "Please select an existing SDR" }),
  sdrNumber: z.string().optional(), // Auto-populated from selected SDR
  currentTitle: z.string().optional(), // Auto-populated from selected SDR
  projectId: z.number().optional(), // Auto-populated from selected SDR
  currentPiId: z.number().optional(), // Auto-populated from selected SDR
  activityType: z.enum(["Human", "Non-Human"]).optional(), // Auto-populated
  
  // Change category with conditional new title
  changeCategory: z.object({
    lpiChange: z.boolean().default(false),
    budgetChange: z.boolean().default(false),
    titleChange: z.boolean().default(false),
    scopeChange: z.boolean().default(false),
    other: z.boolean().default(false),
    otherDescription: z.string().optional(),
  }),
  
  // New title only required if titleChange is true
  newTitle: z.string().optional(),
  
  changeReason: z.string().min(10, "Change reason must be at least 10 characters"),
  newPiId: z.number().optional(),
  budgetSource: z.string().optional(),
  
  // Approval tracking fields
  changeRequestNumber: z.string().optional(), // PMO generated
  approvals: z.object({
    currentPi: z.object({
      name: z.string().optional(),
      date: z.string().optional(),
      signature: z.string().optional(),
    }).optional(),
    newPi: z.object({
      name: z.string().optional(),
      date: z.string().optional(),
      signature: z.string().optional(),
    }).optional(),
    stakeholders: z.object({
      pmo: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      researchLabs: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      biosafety: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      finance: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      grants: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      contracts: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      governance: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
      dataManagement: z.object({ name: z.string().optional(), date: z.string().optional(), signature: z.string().optional() }).optional(),
    }).optional(),
  }).optional(),
}).refine((data) => {
  // If titleChange is true, newTitle is required
  if (data.changeCategory.titleChange && (!data.newTitle || data.newTitle.trim().length < 5)) {
    return false;
  }
  return true;
}, {
  message: "New title is required when title change is selected",
  path: ["newTitle"],
});

type RA205AFormData = z.infer<typeof ra205aFormSchema>;

export default function CreateRA205AApplication() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data for dropdowns
  const { data: scientists = [] } = useQuery<any[]>({
    queryKey: ["/api/scientists"],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: researchActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/research-activities"],
  });

  const form = useForm<RA205AFormData>({
    resolver: zodResolver(ra205aFormSchema),
    defaultValues: {
      selectedSdrId: undefined,
      sdrNumber: "",
      currentTitle: "",
      activityType: "Human",
      projectId: undefined,
      currentPiId: undefined,
      changeCategory: {
        lpiChange: false,
        budgetChange: false,
        titleChange: false,
        scopeChange: false,
        other: false,
        otherDescription: "",
      },
      newTitle: "",
      changeReason: "",
      newPiId: undefined,
      budgetSource: "",
      changeRequestNumber: "",
      approvals: {
        currentPi: { name: "", date: "", signature: "" },
        newPi: { name: "", date: "", signature: "" },
        stakeholders: {
          pmo: { name: "", date: "", signature: "" },
          researchLabs: { name: "Patricia Hachem", date: "", signature: "" },
          biosafety: { name: "", date: "", signature: "" },
          finance: { name: "", date: "30/06/25", signature: "" },
          grants: { name: "Irem Mueed", date: "", signature: "" },
          contracts: { name: "", date: "", signature: "" },
          governance: { name: "", date: "", signature: "" },
          dataManagement: { name: "", date: "", signature: "" },
        },
      },
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RA205AFormData) => {
      return apiRequest("/api/pmo-applications", "POST", {
        formType: "RA-205A",
        title: data.newTitle || data.currentTitle, // Use new title if provided, otherwise current
        sdrNumber: data.sdrNumber,
        currentTitle: data.currentTitle,
        newTitle: data.newTitle,
        activityType: data.activityType,
        changeCategory: data.changeCategory,
        changeReason: data.changeReason,
        projectId: data.projectId || null,
        currentPiId: data.currentPiId || null,
        newPiId: data.newPiId || null,
        budgetSource: data.budgetSource || null,
        leadScientistId: data.newPiId || data.currentPiId || null,
        selectedSdrId: data.selectedSdrId,
        changeRequestNumber: data.changeRequestNumber,
        approvals: data.approvals,
        submittedBy: 46, // Current user - should be dynamic
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pmo-applications"] });
      toast({
        title: "Application Created",
        description: `RA-205A application ${result.applicationId || 'PMO-RA205A-001'} created successfully.`,
      });
      navigate(`/pmo/applications/${result.id || 1}/edit`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RA205AFormData) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeCategory = form.watch("changeCategory");
  const selectedSdrId = form.watch("selectedSdrId");
  
  // Auto-populate fields when SDR is selected
  const handleSdrSelection = (sdrId: string) => {
    const selectedActivity = researchActivities.find((activity: any) => activity.id === parseInt(sdrId));
    if (selectedActivity) {
      form.setValue("selectedSdrId", selectedActivity.id);
      form.setValue("sdrNumber", selectedActivity.sdrNumber);
      form.setValue("currentTitle", selectedActivity.title);
      form.setValue("projectId", selectedActivity.projectId);
      form.setValue("currentPiId", selectedActivity.budgetHolderId);
      // Map sidraBranch to activity type (Research/Clinical -> Human, others -> Non-Human)
      const activityType = selectedActivity.sidraBranch === "Research" || selectedActivity.sidraBranch === "Clinical" ? "Human" : "Non-Human";
      form.setValue("activityType", activityType);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pmo/applications")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to PMO Applications
          </Button>
          
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold">Create RA-205A Application</h1>
              <p className="text-muted-foreground mt-1">Research Activity Change Request Form</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Content - Takes 2 columns */}
          <div className="space-y-6 lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Provide the basic details for the research activity change request
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="sdrNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sidra Project Identifier (SDR) *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., SDR200074" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Research Project Identifier (PRJ)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(projects as any[]).map((project: any) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.identifier} - {project.title}
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
                      name="currentTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current SDR Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Current research activity title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New SDR Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="New research activity title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Human">Human</SelectItem>
                              <SelectItem value="Non-Human">Non-Human</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Change Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Change Category
                    </CardTitle>
                    <CardDescription>
                      Select the type of changes requested (multiple selections allowed)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="changeCategory.lpiChange"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>LPI change/transfer</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="changeCategory.budgetChange"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>PRJ (budget) change</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="changeCategory.titleChange"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>SDR title change</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="changeCategory.scopeChange"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Scope change</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="changeCategory.other"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Other</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {changeCategory?.other && (
                        <FormField
                          control={form.control}
                          name="changeCategory.otherDescription"
                          render={({ field }) => (
                            <FormItem className="ml-6">
                              <FormLabel>Other Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Please specify" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Change Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Details</CardTitle>
                    <CardDescription>
                      Provide detailed information about the requested changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="changeReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for the Change Request *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide detailed justification for the requested changes..."
                              className="min-h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* PI Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Principal Investigator Information
                    </CardTitle>
                    <CardDescription>
                      Current and new PI information (if applicable)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currentPiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current PI</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select current PI" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(scientists as any[]).map((scientist: any) => (
                                <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                  {scientist.firstName} {scientist.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {changeCategory?.lpiChange && (
                      <FormField
                        control={form.control}
                        name="newPiId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New/Transferred PI</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new PI" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(scientists as any[]).map((scientist: any) => (
                                  <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                    {scientist.firstName} {scientist.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {changeCategory?.budgetChange && (
                      <FormField
                        control={form.control}
                        name="budgetSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget Source</FormLabel>
                            <FormControl>
                              <Input placeholder="New budget source/amount" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/pmo/applications")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Application"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Workflow Guide - Takes 1 column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  RA-205A Workflow Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Required Information</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Current SDR identifier</li>
                      <li>• Change category selection</li>
                      <li>• Detailed change justification</li>
                      <li>• PI information updates</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <h4 className="font-medium text-amber-900 mb-2">Review Process</h4>
                    <ul className="space-y-1 text-amber-700">
                      <li>• PMO office review</li>
                      <li>• Stakeholder certifications</li>
                      <li>• PI signature collection</li>
                      <li>• Final approval workflow</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Tips</h4>
                    <ul className="space-y-1 text-green-700">
                      <li>• Be specific in change reason</li>
                      <li>• Select all applicable categories</li>
                      <li>• Coordinate with all stakeholders</li>
                      <li>• Keep original documentation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}