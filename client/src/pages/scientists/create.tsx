import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertScientistSchema } from "@shared/schema";
import { Scientist } from "@shared/schema";
import { ArrowLeft } from "lucide-react";

// Extend the insert schema with additional validations
const createScientistSchema = insertScientistSchema.extend({
  email: z.string().email("Invalid email address"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  supervisorId: z.number().nullable().optional(),
});

type CreateScientistFormValues = z.infer<typeof createScientistSchema>;

export default function CreateScientist() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch all scientists for line manager selection
  const { data: allScientists = [] } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: () => fetch('/api/scientists').then(res => res.json()),
  });

  // Default form values
  const defaultValues: Partial<CreateScientistFormValues> = {
    name: "",
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    staffId: "",
    department: "",
    bio: "",
    profileImageInitials: "",
    supervisorId: null,
  };

  const form = useForm<CreateScientistFormValues>({
    resolver: zodResolver(createScientistSchema),
    defaultValues,
  });

  const createScientistMutation = useMutation({
    mutationFn: async (data: CreateScientistFormValues) => {
      const response = await apiRequest("POST", "/api/scientists", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scientists'] });
      toast({
        title: "Scientist created",
        description: "The scientist has been successfully added to the system.",
      });
      navigate("/scientists");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error creating the scientist.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateScientistFormValues) => {
    // Generate initials from name if not provided
    if (!data.profileImageInitials) {
      const nameParts = data.name.split(' ');
      if (nameParts.length >= 2) {
        data.profileImageInitials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
      } else {
        data.profileImageInitials = data.name.substring(0, 2);
      }
    }
    
    // supervisorId can be null if no line manager is selected

    createScientistMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Add Scientist or Staff</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scientist Information</CardTitle>
          <CardDescription>Enter the details of the new team member</CardDescription>
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
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Dr. Sarah Johnson" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Sarah" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Johnson" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="sarah.johnson@example.com" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff ID</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        5-digit staff ID for badge access
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select job title" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="Investigator">Investigator</SelectItem>
                          <SelectItem value="Physician">Physician</SelectItem>
                          <SelectItem value="Staff Scientist">Staff Scientist</SelectItem>
                          <SelectItem value="Research Specialist">Research Specialist</SelectItem>
                          <SelectItem value="Research Associate">Research Associate</SelectItem>
                          <SelectItem value="Research Assistant">Research Assistant</SelectItem>
                          <SelectItem value="PhD Student">PhD Student</SelectItem>
                          <SelectItem value="Post-doctoral Fellow">Post-doctoral Fellow</SelectItem>
                          <SelectItem value="Lab Manager">Lab Manager</SelectItem>
                          <SelectItem value="PMO Officer">PMO Officer</SelectItem>
                          <SelectItem value="IRB Officer">IRB Officer</SelectItem>
                          <SelectItem value="IBC Officer">IBC Officer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the job title for this scientist or staff member
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Molecular Biology" autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                

                <FormField
                  control={form.control}
                  name="profileImageInitials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initials</FormLabel>
                      <FormControl>
                        <Input placeholder="JD" maxLength={2} autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>
                        Initials shown in profile avatar (max 2 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line Manager</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select line manager (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allScientists.map((scientist) => (
                            <SelectItem key={scientist.id} value={scientist.id.toString()}>
                              {scientist.name} - {scientist.title || 'No title'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the line manager this person reports to (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief biography or research interests" 
                          className="resize-none" 
                          rows={4}
                          {...field}
                          value={field.value || ""} 
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
                  onClick={() => navigate("/scientists")}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createScientistMutation.isPending}
                >
                  {createScientistMutation.isPending ? 'Saving...' : 'Save Scientist'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
