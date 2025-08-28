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
import { Plus, ArrowLeft, Users, Shield, X, Edit } from "lucide-react";
import { insertRoomSchema, Building, Scientist, Room } from "@shared/schema";

const roomFormSchema = insertRoomSchema.extend({
  floor: z.coerce.number().min(1).optional(),
  capacity: z.coerce.number().min(1).optional(),
  area: z.coerce.number().positive().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

export default function EditRoom() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/facilities/rooms/edit/:id');
  const queryClient = useQueryClient();
  const roomId = params?.id ? parseInt(params.id) : null;
  const [certificationInput, setCertificationInput] = useState("");
  const [ppeInput, setPpeInput] = useState("");

  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ['/api/rooms', roomId],
    queryFn: () => fetch(`/api/rooms/${roomId}`).then(res => res.json()),
    enabled: !!roomId,
  });

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
      buildingId: undefined,
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

  // Reset form when room data loads
  useEffect(() => {
    if (room) {
      form.reset({
        buildingId: room.buildingId,
        roomNumber: room.roomNumber || "",
        floor: room.floor || undefined,
        roomType: room.roomType || "",
        capacity: room.capacity || undefined,
        area: room.area ? parseFloat(room.area.toString()) : undefined,
        biosafetyLevel: room.biosafetyLevel || "",
        roomSupervisorId: room.roomSupervisorId || undefined,
        roomManagerId: room.roomManagerId || undefined,
        certifications: Array.isArray(room.certifications) ? room.certifications : [],
        availablePpe: Array.isArray(room.availablePpe) ? room.availablePpe : [],
        equipment: room.equipment || "",
        specialFeatures: room.specialFeatures || "",
        accessRestrictions: room.accessRestrictions || "",
        maintenanceNotes: room.maintenanceNotes || "",
      });
    }
  }, [room, form]);

  const updateRoomMutation = useMutation({
    mutationFn: (data: RoomFormData) => 
      apiRequest('PATCH', `/api/rooms/${roomId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', roomId] });
      queryClient.invalidateQueries({ queryKey: ['/api/buildings'] });
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      navigate('/facilities');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update room",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoomFormData) => {
    updateRoomMutation.mutate(data);
  };

  const addCertification = () => {
    if (certificationInput.trim()) {
      const currentCerts = form.getValues('certifications') || [];
      form.setValue('certifications', [...currentCerts, certificationInput.trim()]);
      setCertificationInput("");
    }
  };

  const removeCertification = (index: number) => {
    const currentCerts = form.getValues('certifications') || [];
    form.setValue('certifications', currentCerts.filter((_, i) => i !== index));
  };

  const addPpe = () => {
    if (ppeInput.trim()) {
      const currentPpe = form.getValues('availablePpe') || [];
      form.setValue('availablePpe', [...currentPpe, ppeInput.trim()]);
      setPpeInput("");
    }
  };

  const removePpe = (index: number) => {
    const currentPpe = form.getValues('availablePpe') || [];
    form.setValue('availablePpe', currentPpe.filter((_, i) => i !== index));
  };

  if (!roomId) {
    navigate('/facilities');
    return null;
  }

  if (isLoading || buildingsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Facilities
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
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

  if (!room) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/facilities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Facilities
          </Button>
          <h1 className="text-2xl font-semibold text-neutral-400">Room Not Found</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">The requested room could not be found.</p>
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
          <Edit className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-semibold text-neutral-400">Edit Room</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
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
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString() || ""}>
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
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString() || ""}>
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
              <div className="space-y-3">
                <FormLabel>Room Certifications</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add certification (e.g., HEPA filtered, Sterile)"
                    value={certificationInput}
                    onChange={(e) => setCertificationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  />
                  <Button type="button" onClick={addCertification} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('certifications')?.map((cert, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {cert}
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Available PPE */}
              <div className="space-y-3">
                <FormLabel>Available PPE</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add PPE item (e.g., Lab coats, Safety goggles)"
                    value={ppeInput}
                    onChange={(e) => setPpeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPpe())}
                  />
                  <Button type="button" onClick={addPpe} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('availablePpe')?.map((ppe, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {ppe}
                      <button
                        type="button"
                        onClick={() => removePpe(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
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
                  disabled={updateRoomMutation.isPending}
                  style={{ backgroundColor: '#6366F1', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5B5BF7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}
                >
                  {updateRoomMutation.isPending ? "Updating..." : "Update Room"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}