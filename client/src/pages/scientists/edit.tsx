import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertScientistSchema, type Scientist } from "@shared/schema";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from "react";

// Extend the insert schema with additional validations
const editScientistSchema = insertScientistSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type EditScientistFormValues = z.infer<typeof editScientistSchema>;

export default function EditScientist() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the scientist data
  const { data: scientist, isLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', id],
    queryFn: () => fetch(`/api/scientists/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  // Fetch all scientists for line manager selection
  const { data: allScientists = [] } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: () => fetch('/api/scientists').then(res => res.json()),
  });

  const form = useForm<EditScientistFormValues>({
    resolver: zodResolver(editScientistSchema),
    defaultValues: {
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
    },
  });

  // Update form when scientist data loads
  useEffect(() => {
    if (scientist) {
      form.reset({
        name: scientist.name || "",
        firstName: scientist.firstName || "",
        lastName: scientist.lastName || "",
        title: scientist.title || "",
        email: scientist.email || "",
        staffId: scientist.staffId || "",
        department: scientist.department || "",
        bio: scientist.bio || "",
        profileImageInitials: scientist.profileImageInitials || "",
        supervisorId: scientist.supervisorId || null,
      });
    }
  }, [scientist, form]);

  const updateScientistMutation = useMutation({
    mutationFn: async (data: EditScientistFormValues) => {
      const response = await apiRequest("PATCH", `/api/scientists/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scientists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scientists', id] });
      toast({
        title: "Scientist updated",
        description: "The scientist has been successfully updated.",
      });
      navigate("/scientists");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error updating the scientist.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditScientistFormValues) => {
    // Generate initials from name if not provided
    if (!data.profileImageInitials) {
      const nameParts = data.name.split(' ');
      if (nameParts.length >= 2) {
        data.profileImageInitials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`;
      } else {
        data.profileImageInitials = data.name.substring(0, 2);
      }
    }
    
    updateScientistMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scientist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Scientist Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p>The scientist you're looking for could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">Edit Scientist</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scientist Information</CardTitle>
          <CardDescription>Update the details for this scientist or staff member</CardDescription>
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
                        <Input placeholder="SJ" maxLength={2} autoComplete="off" data-1p-ignore="true" data-lpignore="true" {...field} value={field.value || ""} />
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
                          {allScientists
                            .filter(scientist => scientist.id !== parseInt(id || "0"))
                            .map((scientist) => (
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
                  disabled={updateScientistMutation.isPending}
                >
                  {updateScientistMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Scientist'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}