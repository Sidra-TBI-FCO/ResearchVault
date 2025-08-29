import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Room, Scientist } from "@shared/schema";
import { 
  Plus, Search, Edit, MoreHorizontal, Building2, 
  ChevronDown, ChevronUp, MapPin, Users, 
  Shield, Wrench
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PermissionWrapper, useElementPermissions } from "@/components/PermissionWrapper";

export default function FacilitiesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBuildings, setExpandedBuildings] = useState<Set<number>>(new Set());
  const { currentUser } = useCurrentUser();
  const { canEdit } = useElementPermissions(currentUser.role, "facilities");

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
    queryFn: () => fetch('/api/buildings').then(res => res.json()),
  });

  const { data: allRooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    queryFn: () => fetch('/api/rooms').then(res => res.json()),
  });

  const { data: scientists } = useQuery<Scientist[]>({
    queryKey: ['/api/scientists'],
    queryFn: () => fetch('/api/scientists').then(res => res.json()),
  });

  // Group rooms by building
  const roomsByBuilding = allRooms?.reduce((acc, room) => {
    if (!acc[room.buildingId]) {
      acc[room.buildingId] = [];
    }
    acc[room.buildingId].push(room);
    return acc;
  }, {} as Record<number, Room[]>) || {};

  const filteredBuildings = buildings?.filter(building => 
    building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBuildingExpansion = (buildingId: number) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  const getBiosafetyLevelBadge = (level: string) => {
    const colors = {
      'BSL-1': 'bg-green-100 text-green-800',
      'BSL-2': 'bg-yellow-100 text-yellow-800',
      'BSL-3': 'bg-orange-100 text-orange-800',
      'BSL-4': 'bg-red-100 text-red-800',
      'ABSL-1': 'bg-blue-100 text-blue-800',
      'ABSL-2': 'bg-purple-100 text-purple-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getScientistInfo = (scientistId: number | null) => {
    if (!scientistId || !scientists) return null;
    return scientists.find(s => s.id === scientistId);
  };

  if (buildingsLoading || roomsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-400">Facilities</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper currentUserRole={currentUser.role} navigationItem="facilities">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-neutral-400">Facilities</h1>
          {canEdit && (
            <div className="flex gap-2">
              <Link href="/facilities/buildings/create">
                <button 
                  className="px-4 py-2 rounded-lg transition-colors hover:opacity-90 flex items-center gap-2 create-button"
                  style={{ 
                    backgroundColor: '#2D9C95',
                    color: 'white',
                    opacity: '1',
                    visibility: 'visible',
                    display: 'flex'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#238B7A'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2D9C95'}
                >
                  <Building2 className="h-4 w-4" />
                  Add Building
                </button>
              </Link>
              <Link href="/facilities/rooms/create">
                <button 
                  className="px-4 py-2 rounded-lg transition-colors hover:opacity-90 flex items-center gap-2 create-button"
                  style={{ 
                    backgroundColor: '#6366F1',
                    color: 'white',
                    opacity: '1',
                    visibility: 'visible',
                    display: 'flex'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5B5BF7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366F1'}
                >
                  <Plus className="h-4 w-4" />
                  Add Room
                </button>
              </Link>
            </div>
          )}
        </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBuildings?.map(building => {
              const buildingRooms = roomsByBuilding[building.id] || [];
              const isExpanded = expandedBuildings.has(building.id);
              
              return (
                <Card key={building.id} className="border-l-4 border-l-blue-500">
                  <CardHeader 
                    className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleBuildingExpansion(building.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBuildingExpansion(building.id);
                          }}
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{building.name}</CardTitle>
                          {building.address && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {building.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {buildingRooms.length} rooms
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/facilities/buildings/edit/${building.id}`}>
                                Edit Building
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/facilities/rooms/create?buildingId=${building.id}`}>
                                Add Room
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {building.description && (
                      <p className="text-sm text-gray-600 mt-2">{building.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500 mt-2">
                      {building.totalFloors && (
                        <span>{building.totalFloors} floors</span>
                      )}
                      {building.maxOccupancy && (
                        <span>Max occupancy: {building.maxOccupancy}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  {isExpanded && buildingRooms.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="font-medium text-sm text-gray-700 mb-3">Rooms</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Room</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Floor</TableHead>
                              <TableHead>Biosafety Level</TableHead>
                              <TableHead>Supervisor</TableHead>
                              <TableHead>Manager</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {buildingRooms.map(room => (
                              <TableRow key={room.id}>
                                <TableCell className="font-medium">
                                  {room.roomNumber}
                                </TableCell>
                                <TableCell>{room.roomType || 'N/A'}</TableCell>
                                <TableCell>{room.floor || 'N/A'}</TableCell>
                                <TableCell>
                                  {room.biosafetyLevel ? (
                                    <Badge className={getBiosafetyLevelBadge(room.biosafetyLevel)}>
                                      <Shield className="h-3 w-3 mr-1" />
                                      {room.biosafetyLevel}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {room.roomSupervisorId ? (
                                    (() => {
                                      const supervisor = getScientistInfo(room.roomSupervisorId);
                                      return supervisor ? (
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900">{supervisor.name}</div>
                                          <div className="text-gray-500 text-xs">{supervisor.email}</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">Not found</span>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-gray-400">Not assigned</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {room.roomManagerId ? (
                                    (() => {
                                      const manager = getScientistInfo(room.roomManagerId);
                                      return manager ? (
                                        <div className="text-sm">
                                          <div className="font-medium text-gray-900">{manager.name}</div>
                                          <div className="text-gray-500 text-xs">{manager.email}</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">Not found</span>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-gray-400">Not assigned</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {canEdit && (
                                    <Link href={`/facilities/rooms/edit/${room.id}`}>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 edit-button">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            
            {filteredBuildings?.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No buildings found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first building.'}
                </p>
                {!searchQuery && canEdit && (
                  <Link href="/facilities/buildings/create">
                    <Button className="create-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Building
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </PermissionWrapper>
  );
}