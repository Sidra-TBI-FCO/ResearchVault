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
import { insertProjectSchema } from "@shared/schema";
import { Scientist, ProjectGroup } from "@shared/schema";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Extend the insert schema with additional validations
const createProjectSchema = insertProjectSchema.extend({
  sdrNumber: z.string().min(3, "SDR number must be at least 3 characters"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  shortTitle: z.string().optional(),
  description: z.string().optional(),
  projectGroupId: z.number({
    required_error: "Please select a project",
  }),
  leadPIId: z.number({
    required_error: "Please select a lead principal investigator",
  }),
  budgetHolderId: z.number().optional(),
  lineManagerId: z.number().optional(),
  additionalNotificationEmail: z.string().email().optional().or(z.literal("")),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(["planning", "active", "completed", "on_hold", "pending", "suspended"], {
    required_error: "Please select a status",
  }),
  sidraBranch: z.string().optional(),
  budgetSource: z.string().optional(),
  objectives: z.string().optional(),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export default function CreateProject() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get all principal investigators for lead scientist selection
  const { data: principalInvestigators, isLoading: piLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/principal-investigators'],
  });

  // Get all projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get all scientists
  const { data: scientists, isLoading: scientistsLoading } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
  });

  // Default form values
  const defaultValues: Partial<CreateProjectFormValues> = {
    status: "planning",
    sidraBranch: "Research",
  };

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectFormValues) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project created",
        description: "The project has been successfully created.",
      });
      navigate("/projects");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the project.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Create New Project</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Enter the details for the new research project</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sdrNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SDR Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SDR-2023-001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this research activity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsLoading ? (
                            <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                          ) : (
                            projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Project this research activity belongs to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Research Activity Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CRISPR-Cas9 Gene Editing for Cancer Treatment" {...field} />
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
                        <Input placeholder="e.g. CRISPR Cancer Treatment" {...field} />
                      </FormControl>
                      <FormDescription>
                        Brief name for easier reference
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
                          placeholder="Brief description of the research activity" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="leadPIId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Investigator</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead PI" />
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
                  name="budgetHolderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Holder</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget holder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {scientistsLoading ? (
                            <SelectItem value="loading" disabled>Loading scientists...</SelectItem>
                          ) : (
                            scientists?.map((scientist) => (
                              <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                {scientist.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Person responsible for budget management
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lineManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line Manager</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select line manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {scientistsLoading ? (
                            <SelectItem value="loading" disabled>Loading scientists...</SelectItem>
                          ) : (
                            scientists?.map((scientist) => (
                              <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                {scientist.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Supervisor or administrative manager
                      </FormDescription>
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
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalNotificationEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notification Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="e.g. notifications@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Secondary email for project notifications
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sidraBranch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sidra Branch</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Research">Research</SelectItem>
                          <SelectItem value="Clinical">Clinical</SelectItem>
                          <SelectItem value="External">External</SelectItem>
                          <SelectItem value="Administrative">Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Branch or department within Sidra
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="budgetSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Source</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IRF">IRF</SelectItem>
                          <SelectItem value="PI Fund">PI Fund</SelectItem>
                          <SelectItem value="QNRF">QNRF</SelectItem>
                          <SelectItem value="External Grant">External Grant</SelectItem>
                          <SelectItem value="Institutional">Institutional</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Source of funding for this activity
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Objectives</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Key objectives and goals of the research activity" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        List specific aims and expected outcomes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="flex justify-end space-x-2 px-0">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/projects")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
