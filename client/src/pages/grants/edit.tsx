import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatFullName } from "@/utils/nameUtils";

export default function EditGrant() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/grants/:id/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const grantId = params?.id ? parseInt(params.id) : null;

  // Simple form state
  const [formData, setFormData] = useState({
    projectNumber: "",
    title: "",
    description: "",
    cycle: "",
    status: "pending",
    fundingAgency: "",
    investigatorType: "Researcher",
    lpiId: "",
    requestedAmount: "",
    awardedAmount: "",
    submittedYear: "",
    awardedYear: "",
    awarded: false,
    runningTimeYears: "",
    currentGrantYear: "",
    startDate: "",
    endDate: "",
    collaborators: "",
  });

  const [linkedSdrs, setLinkedSdrs] = useState<number[]>([]);

  const { data: grant, isLoading: isLoadingGrant } = useQuery({
    queryKey: [`/api/grants/${grantId}`],
    enabled: !!grantId,
  });

  const { data: scientists = [] } = useQuery({
    queryKey: ['/api/scientists']
  });

  const { data: researchActivities = [] } = useQuery({
    queryKey: ['/api/research-activities']
  });

  const { data: grantSdrs = [] } = useQuery({
    queryKey: [`/api/grants/${grantId}/research-activities`],
    enabled: !!grantId,
  });

  // Load grant data into form once - using a ref to prevent infinite loops
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    if (grant && !Array.isArray(grant) && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setFormData({
        projectNumber: grant.projectNumber || "",
        title: grant.title || "",
        description: grant.description || "",
        cycle: grant.cycle || "",
        status: grant.status || "pending",
        fundingAgency: grant.fundingAgency || "",
        investigatorType: grant.investigatorType || "Researcher",
        lpiId: grant.lpiId ? grant.lpiId.toString() : "",
        requestedAmount: grant.requestedAmount || "",
        awardedAmount: grant.awardedAmount || "",
        submittedYear: grant.submittedYear ? grant.submittedYear.toString() : "",
        awardedYear: grant.awardedYear ? grant.awardedYear.toString() : "",
        awarded: grant.awarded || false,
        runningTimeYears: grant.runningTimeYears ? grant.runningTimeYears.toString() : "",
        currentGrantYear: grant.currentGrantYear ? grant.currentGrantYear.toString() : "",
        startDate: grant.startDate ? grant.startDate.split('T')[0] : "",
        endDate: grant.endDate ? grant.endDate.split('T')[0] : "",
        collaborators: Array.isArray(grant.collaborators) ? grant.collaborators.join('\n') : "",
      });
    }
  }, [grant]);

  // Load linked SDRs
  useEffect(() => {
    if (grantSdrs) {
      setLinkedSdrs(grantSdrs.map((sdr: any) => sdr.id));
    }
  }, [grantSdrs]);

  const updateGrantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/grants/${grantId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update grant');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${grantId}`] });
      toast({
        title: "Success",
        description: "Grant updated successfully",
      });
      navigate("/grants");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update grant",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const collaborators = formData.collaborators 
      ? formData.collaborators.split('\n').filter(line => line.trim())
      : [];

    const payload = {
      ...formData,
      lpiId: formData.lpiId ? parseInt(formData.lpiId) : null,
      submittedYear: formData.submittedYear ? parseInt(formData.submittedYear) : null,
      awardedYear: formData.awardedYear ? parseInt(formData.awardedYear) : null,
      runningTimeYears: formData.runningTimeYears ? parseInt(formData.runningTimeYears) : null,
      currentGrantYear: formData.currentGrantYear ? parseInt(formData.currentGrantYear) : null,
      collaborators,
    };

    updateGrantMutation.mutate(payload);
  };

  const handleSdrToggle = (sdrId: number, checked: boolean) => {
    if (checked) {
      setLinkedSdrs([...linkedSdrs, sdrId]);
    } else {
      setLinkedSdrs(linkedSdrs.filter(id => id !== sdrId));
    }
  };

  if (isLoadingGrant) {
    return <div className="p-6">Loading...</div>;
  }

  if (!grant) {
    return <div className="p-6">Grant not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/grants")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Grants
        </Button>
        <h1 className="text-3xl font-bold">Edit Grant</h1>
        <p className="text-muted-foreground">Update grant information and details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Project Number *
                </label>
                <Input
                  value={formData.projectNumber}
                  onChange={(e) => setFormData({...formData, projectNumber: e.target.value})}
                  placeholder="e.g., NIH-R01-123456"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Cycle *
                </label>
                <Input
                  value={formData.cycle}
                  onChange={(e) => setFormData({...formData, cycle: e.target.value})}
                  placeholder="e.g., 2024-1"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Grant title"
                required
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the grant"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Grant Details */}
        <Card>
          <CardHeader>
            <CardTitle>Grant Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Funding Agency
                </label>
                <Input
                  value={formData.fundingAgency}
                  onChange={(e) => setFormData({...formData, fundingAgency: e.target.value})}
                  placeholder="e.g., NIH, NSF, DOE"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Investigator Type
                </label>
                <RadioGroup
                  value={formData.investigatorType}
                  onValueChange={(value) => setFormData({...formData, investigatorType: value})}
                  className="flex flex-row space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Researcher" id="researcher" />
                    <Label htmlFor="researcher">Researcher</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Co-Investigator" id="co-investigator" />
                    <Label htmlFor="co-investigator">Co-Investigator</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Lead Principal Investigator
                </label>
                <Select
                  value={formData.lpiId}
                  onValueChange={(value) => setFormData({...formData, lpiId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scientist" />
                  </SelectTrigger>
                  <SelectContent>
                    {scientists.map((scientist: any) => (
                      <SelectItem key={scientist.id} value={scientist.id.toString()}>
                        {formatFullName(scientist)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Requested Amount
                </label>
                <Input
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({...formData, requestedAmount: e.target.value})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Awarded Amount
                </label>
                <Input
                  value={formData.awardedAmount}
                  onChange={(e) => setFormData({...formData, awardedAmount: e.target.value})}
                  placeholder="$0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Submitted Year
                </label>
                <Input
                  type="number"
                  value={formData.submittedYear}
                  onChange={(e) => setFormData({...formData, submittedYear: e.target.value})}
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Awarded Year
                </label>
                <Input
                  type="number"
                  value={formData.awardedYear}
                  onChange={(e) => setFormData({...formData, awardedYear: e.target.value})}
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Running Time (Years)
                </label>
                <Input
                  type="number"
                  value={formData.runningTimeYears}
                  onChange={(e) => setFormData({...formData, runningTimeYears: e.target.value})}
                  placeholder="3"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Current Grant Year
                </label>
                <Input
                  type="number"
                  value={formData.currentGrantYear}
                  onChange={(e) => setFormData({...formData, currentGrantYear: e.target.value})}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Grant Awarded</label>
              </div>
              <Switch
                checked={formData.awarded}
                onCheckedChange={(checked) => setFormData({...formData, awarded: checked})}
              />
            </div>

            {/* SDR Linking Section - Only show when grant is awarded */}
            {formData.awarded && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Linked Research Activities (SDRs)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {researchActivities.length > 0 ? (
                    researchActivities.map((sdr: any) => {
                      const isLinked = linkedSdrs.includes(sdr.id);
                      return (
                        <div key={sdr.id} className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={(e) => handleSdrToggle(sdr.id, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{sdr.sdrNumber}</div>
                            <div className="text-sm text-gray-500 truncate">{sdr.title}</div>
                            <div className="text-xs text-gray-400">{sdr.status}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">No research activities available to link.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grant Dates & Collaborators */}
        <Card>
          <CardHeader>
            <CardTitle>Grant Dates & Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Collaborators (one per line)
              </label>
              <Textarea
                value={formData.collaborators}
                onChange={(e) => setFormData({...formData, collaborators: e.target.value})}
                placeholder="Dr. John Smith, University of Example&#10;Dr. Jane Doe, Research Institute&#10;..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/grants")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updateGrantMutation.isPending}
          >
            {updateGrantMutation.isPending ? "Updating..." : "Update Grant"}
          </Button>
        </div>
      </form>
    </div>
  );
}