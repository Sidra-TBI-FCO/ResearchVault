import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ArrowLeft, Users, Shield, X } from "lucide-react";
import { insertRoomSchema, Building, Scientist } from "@shared/schema";

const roomFormSchema = insertRoomSchema.extend({
  floor: z.coerce.number().min(1).optional(),
  capacity: z.coerce.number().min(1).optional(),
  area: z.coerce.number().positive().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

// Predefined certification options
const CERTIFICATION_OPTIONS = [
  "HEPA Filtered",
  "Sterile Environment", 
  "Temperature Controlled",
  "Humidity Controlled",
  "Negative Pressure",
  "Positive Pressure",
  "Laminar Flow",
  "Clean Room Certified",
  "Radiation Controlled",
  "Chemical Fume Hood",
  "Biological Safety Cabinet",
  "Autoclave Access"
];

// Predefined PPE options  
const PPE_OPTIONS = [
  "Lab Coats",
  "Safety Goggles", 
  "N95 Masks",
  "Nitrile Gloves",
  "Hair Nets",
  "Shoe Covers",
  "Face Shields",
  "Respirators",
  "Cut-Resistant Gloves",
  "Chemical-Resistant Gloves",
  "Disposable Gowns",
  "Safety Glasses"
];

export default function CreateRoom() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Get buildingId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedBuildingId = urlParams.get('buildingId');

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
    queryFn: () => fetch('/api/buildings').then(res => res.json()),
  });

  const { data: investigators } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists/investigators'],
    queryFn: () => fetch('/api/scientists/investigators').then(res => res.json()),
  });

  const { data: scientificStaff } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists/scientific-staff'],
    queryFn: () => fetch('/api/scientists/scientific-staff').then(res => res.json()),
  });

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      buildingId: preselectedBuildingId ? parseInt(preselectedBuildingId) : undefined,
      roomNumber: "",
      floor: undefined,
      roomType: "",
      capacity: undefined,
      area: undefined,
      biosafetyLevel: "",
      roomSupervisorId: undefined,
      roomManagerId: undefined,
      certifications: [],
      availablePpe: [],
      equipment: "",
      specialFeatures: "",
      accessRestrictions: "",
      maintenanceNotes: "",
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: RoomFormData) => 
      apiRequest('POST', '/api/rooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      toast({
        title: "Success",
        description: "Room created successfully",
      });
      navigate('/facilities');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoomFormData) => {
    createRoomMutation.mutate(data);
  };

  const toggleCertification = (certification: string) => {
    const currentCerts = form.getValues('certifications') || [];
    const isSelected = currentCerts.includes(certification);
    
    if (isSelected) {
      form.setValue('certifications', currentCerts.filter(cert => cert !== certification));
    } else {
      form.setValue('certifications', [...currentCerts, certification]);
    }
  };

  const togglePpe = (ppe: string) => {
    const currentPpe = form.getValues('availablePpe') || [];
    const isSelected = currentPpe.includes(ppe);
    
    if (isSelected) {
      form.setValue('availablePpe', currentPpe.filter(item => item !== ppe));
    } else {
      form.setValue('availablePpe', [...currentPpe, ppe]);
    }
  };

  if (buildingsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/facilities')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Facilities
        </Button>
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-semibold text-neutral-400">Create Room</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Room Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings?.map((building) => (
                            <SelectItem key={building.id} value={building.id.toString()}>
                              {building.name}
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
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 101, A-204" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g., 2"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laboratory">Laboratory</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Conference Room">Conference Room</SelectItem>
                          <SelectItem value="Storage">Storage</SelectItem>
                          <SelectItem value="Clean Room">Clean Room</SelectItem>
                          <SelectItem value="Cold Room">Cold Room</SelectItem>
                          <SelectItem value="Equipment Room">Equipment Room</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select BSL" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BSL-1">BSL-1</SelectItem>
                          <SelectItem value="BSL-2">BSL-2</SelectItem>
                          <SelectItem value="BSL-3">BSL-3</SelectItem>
                          <SelectItem value="BSL-4">BSL-4</SelectItem>
                          <SelectItem value="ABSL-1">ABSL-1</SelectItem>
                          <SelectItem value="ABSL-2">ABSL-2</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (people)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g., 6"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 150.5"
                          {...field}
                          value={field.value || ""}
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
                  name="roomSupervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Supervisor</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investigators?.map((investigator) => (
                            <SelectItem key={investigator.id} value={investigator.id.toString()}>
                              {investigator.name} ({investigator.title})
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
                  name="roomManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Manager</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {scientificStaff?.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name} ({staff.title})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Certifications */}
              <div className="space-y-4">
                <FormLabel className="text-base font-medium">Room Certifications</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CERTIFICATION_OPTIONS.map((certification) => (
                    <div key={certification} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cert-${certification}`}
                        checked={form.watch('certifications')?.includes(certification) || false}
                        onCheckedChange={() => toggleCertification(certification)}
                      />
                      <label
                        htmlFor={`cert-${certification}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {certification}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available PPE */}
              <div className="space-y-4">
                <FormLabel className="text-base font-medium">Available PPE</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PPE_OPTIONS.map((ppe) => (
                    <div key={ppe} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ppe-${ppe}`}
                        checked={form.watch('availablePpe')?.includes(ppe) || false}
                        onCheckedChange={() => togglePpe(ppe)}
                      />
                      <label
                        htmlFor={`ppe-${ppe}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {ppe}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List major equipment in this room"
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
                name="specialFeatures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Features</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Special features or capabilities of this room"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="accessRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Restrictions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Access requirements or restrictions"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maintenanceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Maintenance requirements or notes"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/facilities')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRoomMutation.isPending}
                  style={{ backgroundColor: '#6366F1', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5B5BF7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}
                >
                  {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}