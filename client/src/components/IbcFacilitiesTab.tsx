import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building, Room, IbcApplication,
  IbcApplicationRoom, IbcBackboneSourceRoom, IbcApplicationPpe
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, MapPin, Shield, Plus, X, 
  FlaskConical, ShieldCheck, Trash2, AlertTriangle 
} from "lucide-react";

interface IbcFacilitiesTabProps {
  applicationId: number;
  application: IbcApplication;
  isReadOnly?: boolean;
}

const roomSelectionSchema = z.object({
  roomId: z.number({ required_error: "Please select a room" }),
});

const backboneSourceRoomSchema = z.object({
  backboneSource: z.string({ required_error: "Please select a backbone source" }),
  roomId: z.number({ required_error: "Please select a room" }),
});

const ppeSelectionSchema = z.object({
  roomId: z.number({ required_error: "Please select a room" }),
  ppeItems: z.array(z.string()).min(1, "Please select at least one PPE item"),
});

export default function IbcFacilitiesTab({ applicationId, application, isReadOnly = false }: IbcFacilitiesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoomForBackbone, setSelectedRoomForBackbone] = useState<number | null>(null);
  const [selectedRoomForPpe, setSelectedRoomForPpe] = useState<number | null>(null);

  // Fetch all buildings and rooms
  const { data: buildings } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
  });

  const { data: allRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  // Fetch IBC application facilities data
  const { data: applicationRooms, refetch: refetchRooms } = useQuery<IbcApplicationRoom[]>({
    queryKey: ['/api/ibc-applications', applicationId, 'rooms'],
  });

  const { data: backboneSourceRooms, refetch: refetchBackboneSources } = useQuery<IbcBackboneSourceRoom[]>({
    queryKey: ['/api/ibc-applications', applicationId, 'backbone-source-rooms'],
  });

  const { data: applicationPpe, refetch: refetchPpe } = useQuery<IbcApplicationPpe[]>({
    queryKey: ['/api/ibc-applications', applicationId, 'ppe'],
  });

  // Forms
  const roomForm = useForm<z.infer<typeof roomSelectionSchema>>({
    resolver: zodResolver(roomSelectionSchema),
  });

  const backboneForm = useForm<z.infer<typeof backboneSourceRoomSchema>>({
    resolver: zodResolver(backboneSourceRoomSchema),
  });

  const ppeForm = useForm<z.infer<typeof ppeSelectionSchema>>({
    resolver: zodResolver(ppeSelectionSchema),
  });

  // Mutations
  const addRoomMutation = useMutation({
    mutationFn: (data: { roomId: number }) => 
      apiRequest(`/api/ibc-applications/${applicationId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      refetchRooms();
      roomForm.reset();
      toast({ title: "Room added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add room", variant: "destructive" });
    },
  });

  const removeRoomMutation = useMutation({
    mutationFn: (roomId: number) => 
      apiRequest(`/api/ibc-applications/${applicationId}/rooms/${roomId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      refetchRooms();
      refetchBackboneSources();
      refetchPpe();
      toast({ title: "Room removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove room", variant: "destructive" });
    },
  });

  const addBackboneSourceMutation = useMutation({
    mutationFn: (data: { backboneSource: string; roomId: number }) => 
      apiRequest(`/api/ibc-applications/${applicationId}/backbone-source-rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      refetchBackboneSources();
      backboneForm.reset();
      setSelectedRoomForBackbone(null);
      toast({ title: "Backbone source assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign backbone source", variant: "destructive" });
    },
  });

  const removeBackboneSourceMutation = useMutation({
    mutationFn: ({ backboneSource, roomId }: { backboneSource: string; roomId: number }) => 
      apiRequest(`/api/ibc-applications/${applicationId}/backbone-source-rooms/${encodeURIComponent(backboneSource)}/${roomId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      refetchBackboneSources();
      toast({ title: "Backbone source assignment removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove backbone source assignment", variant: "destructive" });
    },
  });

  const addPpeMutation = useMutation({
    mutationFn: (data: { roomId: number; ppeItem: string }) => 
      apiRequest(`/api/ibc-applications/${applicationId}/ppe`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      refetchPpe();
      toast({ title: "PPE added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add PPE", variant: "destructive" });
    },
  });

  const removePpeMutation = useMutation({
    mutationFn: ({ roomId, ppeItem }: { roomId: number; ppeItem: string }) => 
      apiRequest(`/api/ibc-applications/${applicationId}/ppe/${roomId}/${encodeURIComponent(ppeItem)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      refetchPpe();
      toast({ title: "PPE removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove PPE", variant: "destructive" });
    },
  });

  // Helper functions
  const getAvailableRooms = () => {
    if (!allRooms || !applicationRooms) return [];
    const assignedRoomIds = applicationRooms.map(ar => ar.roomId);
    return allRooms.filter(room => !assignedRoomIds.includes(room.id));
  };

  const getAssignedRooms = () => {
    if (!allRooms || !applicationRooms) return [];
    const assignedRoomIds = applicationRooms.map(ar => ar.roomId);
    return allRooms.filter(room => assignedRoomIds.includes(room.id));
  };

  const getRoomInfo = (roomId: number) => {
    return allRooms?.find(room => room.id === roomId);
  };

  const getBuildingInfo = (buildingId: number) => {
    return buildings?.find(building => building.id === buildingId);
  };

  const getAvailableBackboneSources = () => {
    if (!application?.syntheticExperiments) return [];
    const syntheticExperiments = Array.isArray(application.syntheticExperiments) 
      ? application.syntheticExperiments 
      : [];
    
    return syntheticExperiments
      .filter((exp: any) => exp.backboneSource && exp.backboneSource.trim() !== '')
      .map((exp: any) => exp.backboneSource)
      .filter((source, index, arr) => arr.indexOf(source) === index); // Remove duplicates
  };

  const getAvailablePpeForRoom = (roomId: number) => {
    const room = getRoomInfo(roomId);
    if (!room?.availablePpe) return [];
    
    const availablePpe = Array.isArray(room.availablePpe) ? room.availablePpe : [];
    const assignedPpe = applicationPpe?.filter(ppe => ppe.roomId === roomId).map(ppe => ppe.ppeItem) || [];
    
    return availablePpe.filter(ppe => !assignedPpe.includes(ppe));
  };

  const getAssignedPpeForRoom = (roomId: number) => {
    return applicationPpe?.filter(ppe => ppe.roomId === roomId) || [];
  };

  const onAddRoom = (data: z.infer<typeof roomSelectionSchema>) => {
    addRoomMutation.mutate(data);
  };

  const onAddBackboneSource = (data: z.infer<typeof backboneSourceRoomSchema>) => {
    addBackboneSourceMutation.mutate(data);
  };

  const onAddPpe = (data: z.infer<typeof ppeSelectionSchema>) => {
    data.ppeItems.forEach(ppeItem => {
      addPpeMutation.mutate({ roomId: data.roomId, ppeItem });
    });
    ppeForm.reset();
    setSelectedRoomForPpe(null);
  };

  const availableBackboneSources = getAvailableBackboneSources();
  const assignedRooms = getAssignedRooms();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Facilities & Laboratory Assignments</h3>
          <p className="text-sm text-gray-600">
            Assign rooms, backbone sources, and PPE for this IBC application
          </p>
        </div>
      </div>

      {/* Room Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Room Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isReadOnly && (
            <Form {...roomForm}>
              <form onSubmit={roomForm.handleSubmit(onAddRoom)} className="flex gap-4 items-end">
                <FormField
                  control={roomForm.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Add Room</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a room to add" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getAvailableRooms().map(room => {
                            const building = getBuildingInfo(room.buildingId);
                            return (
                              <SelectItem key={room.id} value={room.id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{building?.name} - {room.roomNumber}</span>
                                  {room.biosafetyLevel && (
                                    <Badge variant="outline" className="ml-2">
                                      {room.biosafetyLevel}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  onClick={roomForm.handleSubmit(onAddRoom)}
                  disabled={addRoomMutation.isPending}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </form>
            </Form>
          )}

          {/* Assigned Rooms */}
          <div className="space-y-3">
            {assignedRooms.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No rooms assigned yet</p>
            ) : (
              assignedRooms.map(room => {
                const building = getBuildingInfo(room.buildingId);
                return (
                  <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{building?.name} - {room.roomNumber}</div>
                        <div className="text-sm text-gray-600">
                          {room.roomType} • Floor {room.floor}
                          {room.biosafetyLevel && (
                            <Badge variant="outline" className="ml-2">
                              <Shield className="h-3 w-3 mr-1" />
                              {room.biosafetyLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoomMutation.mutate(room.id)}
                        disabled={removeRoomMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Backbone Source Room Assignments */}
      {assignedRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Backbone Source Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableBackboneSources.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  No backbone sources available. Add synthetic experiments with backbone sources first.
                </p>
              </div>
            ) : (
              <>
                {!isReadOnly && (
                  <Form {...backboneForm}>
                    <form onSubmit={backboneForm.handleSubmit(onAddBackboneSource)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <FormField
                        control={backboneForm.control}
                        name="backboneSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Backbone Source</FormLabel>
                            <Select onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select backbone source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableBackboneSources.map(source => (
                                  <SelectItem key={source} value={source}>
                                    {source}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={backboneForm.control}
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign to Room</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select room" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {assignedRooms.map(room => {
                                  const building = getBuildingInfo(room.buildingId);
                                  return (
                                    <SelectItem key={room.id} value={room.id.toString()}>
                                      {building?.name} - {room.roomNumber}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="button" 
                        onClick={backboneForm.handleSubmit(onAddBackboneSource)}
                        disabled={addBackboneSourceMutation.isPending}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </form>
                  </Form>
                )}

                {/* Backbone Source Assignments */}
                <div className="space-y-3">
                  {!backboneSourceRooms || backboneSourceRooms.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No backbone sources assigned yet</p>
                  ) : (
                    backboneSourceRooms.map(assignment => {
                      const room = getRoomInfo(assignment.roomId);
                      const building = room ? getBuildingInfo(room.buildingId) : null;
                      return (
                        <div key={`${assignment.backboneSource}-${assignment.roomId}`} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FlaskConical className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-medium">{assignment.backboneSource}</div>
                              <div className="text-sm text-gray-600">
                                {building?.name} - {room?.roomNumber}
                              </div>
                            </div>
                          </div>
                          {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBackboneSourceMutation.mutate({
                                backboneSource: assignment.backboneSource,
                                roomId: assignment.roomId
                              })}
                              disabled={removeBackboneSourceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* PPE Selection */}
      {assignedRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Personal Protective Equipment (PPE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isReadOnly && (
              <Form {...ppeForm}>
                <form onSubmit={ppeForm.handleSubmit(onAddPpe)} className="space-y-4">
                  <FormField
                    control={ppeForm.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Room for PPE</FormLabel>
                        <Select onValueChange={(value) => {
                          const roomId = parseInt(value);
                          field.onChange(roomId);
                          setSelectedRoomForPpe(roomId);
                          ppeForm.setValue('ppeItems', []);
                        }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assignedRooms.map(room => {
                              const building = getBuildingInfo(room.buildingId);
                              return (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  {building?.name} - {room.roomNumber}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedRoomForPpe && (
                    <FormField
                      control={ppeForm.control}
                      name="ppeItems"
                      render={() => {
                        const availablePpe = getAvailablePpeForRoom(selectedRoomForPpe);
                        return (
                          <FormItem>
                            <FormLabel>Available PPE</FormLabel>
                            {availablePpe.length === 0 ? (
                              <p className="text-sm text-gray-500">No additional PPE available for this room</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {availablePpe.map((ppeItem) => (
                                  <FormField
                                    key={ppeItem}
                                    control={ppeForm.control}
                                    name="ppeItems"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(ppeItem)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value || [], ppeItem])
                                                : field.onChange(
                                                    field.value?.filter((value) => value !== ppeItem)
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {ppeItem}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}

                  {selectedRoomForPpe && getAvailablePpeForRoom(selectedRoomForPpe).length > 0 && (
                    <Button 
                      type="button" 
                      onClick={ppeForm.handleSubmit(onAddPpe)}
                      disabled={addPpeMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Selected PPE
                    </Button>
                  )}
                </form>
              </Form>
            )}

            {/* PPE Assignments by Room */}
            <div className="space-y-4">
              {assignedRooms.map(room => {
                const building = getBuildingInfo(room.buildingId);
                const assignedPpe = getAssignedPpeForRoom(room.id);
                
                if (assignedPpe.length === 0) return null;

                return (
                  <div key={room.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{building?.name} - {room.roomNumber}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignedPpe.map(ppe => (
                        <Badge 
                          key={`${ppe.roomId}-${ppe.ppeItem}`} 
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {ppe.ppeItem}
                          {!isReadOnly && (
                            <button
                              onClick={() => removePpeMutation.mutate({
                                roomId: ppe.roomId,
                                ppeItem: ppe.ppeItem
                              })}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}