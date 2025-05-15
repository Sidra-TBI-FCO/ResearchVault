import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scientist, insertScientistSchema } from "@shared/schema";
import { ArrowLeft, Mail, Phone, Building, Calendar, User, Pencil, Save, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function ScientistDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scientist, isLoading } = useQuery<Scientist>({
    queryKey: ['/api/scientists', id],
    queryFn: async () => {
      const response = await fetch(`/api/scientists/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch scientist');
      }
      return response.json();
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (updateData: Partial<Scientist>) => {
      const response = await fetch(`/api/scientists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update scientist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scientists', id] });
      setEditMode(false);
      toast({
        title: "Success",
        description: "Scientist details updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during update",
        variant: "destructive",
      });
    }
  });
  
  const form = useForm<Partial<Scientist>>({
    resolver: zodResolver(insertScientistSchema.partial()),
    defaultValues: {
      name: scientist?.name || '',
      title: scientist?.title || '',
      email: scientist?.email || '',
      phoneNumber: scientist?.phoneNumber || '',
      department: scientist?.department || '',
      expertise: scientist?.expertise || '',
      staffId: scientist?.staffId || '',
      bio: scientist?.bio || '',
      isStaff: scientist?.isStaff || false,
    },
  });
  
  // Update form values when scientist data changes
  React.useEffect(() => {
    if (scientist) {
      form.reset({
        name: scientist.name,
        title: scientist.title,
        email: scientist.email,
        phoneNumber: scientist.phoneNumber,
        department: scientist.department,
        expertise: scientist.expertise,
        staffId: scientist.staffId,
        bio: scientist.bio,
        isStaff: scientist.isStaff,
      });
    }
  }, [scientist, form]);

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
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
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
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-lg text-neutral-400">The scientist you're looking for could not be found.</p>
              <Button className="mt-4" onClick={() => navigate("/scientists")}>
                Return to Scientists List
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/scientists")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-400">{scientist.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Personal and contact information</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEditMode(!editMode)}
              className="ml-auto"
            >
              {editMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => updateMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" />
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
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Staff Scientist, Research Assistant" />
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
                            <Input {...field} type="email" placeholder="Email address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Phone number" />
                          </FormControl>
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
                            <Input {...field} placeholder="Department" />
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
                            <Input {...field} placeholder="Staff ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biography</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                            placeholder="Professional biography"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <>
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24 text-lg">
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {scientist.profileImageInitials || scientist.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {scientist.name}
                        {scientist.staffId && (
                          <Badge variant="outline" className="ml-3 rounded-sm bg-blue-50 text-blue-700 border-blue-200">
                            ID: {scientist.staffId}
                          </Badge>
                        )}
                      </h2>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-neutral-500 mr-2">Job Title:</div>
                        <p className="text-neutral-700">
                          {scientist.title || (scientist.isStaff ? "Research Staff" : "Principal Investigator")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {scientist.isStaff ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Staff</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Principal Investigator</Badge>
                      )}
                      {scientist.department && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{scientist.department}</Badge>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      {scientist.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <a href={`mailto:${scientist.email}`} className="text-primary-600 hover:underline">
                            {scientist.email}
                          </a>
                        </div>
                      )}
                      {scientist.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-neutral-400" />
                          <a href={`tel:${scientist.phoneNumber}`} className="text-primary-600 hover:underline">
                            {scientist.phoneNumber}
                          </a>
                        </div>
                      )}
                      {scientist.department && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-neutral-400" />
                          <span>{scientist.department}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {scientist.bio && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Biography</h3>
                    <p className="text-neutral-600">{scientist.bio}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scientist.staffId && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Staff ID</h3>
                    <p className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      <span>{scientist.staffId}</span>
                    </p>
                  </div>
                )}
              
                {scientist.expertise && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Areas of Expertise</h3>
                    <p>{scientist.expertise}</p>
                  </div>
                )}
                
                {scientist.orcidId && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">ORCID ID</h3>
                    <p>{scientist.orcidId}</p>
                  </div>
                )}
                
                {scientist.isStaff && scientist.supervisorId && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Reports To</h3>
                    <p>ID: {scientist.supervisorId}</p>
                  </div>
                )}
                
                {scientist.createdAt && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">Added On</h3>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(scientist.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Related Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-400">Projects list to be added.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}