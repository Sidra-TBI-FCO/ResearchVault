import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scientist } from "@shared/schema";
import { ArrowLeft, Mail, Phone, Building, Award, Calendar, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export default function ScientistDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

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
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <p className="text-neutral-400">
                    {scientist.title || (scientist.isStaff ? "Research Staff" : "Principal Investigator")}
                  </p>
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