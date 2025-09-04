import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, DollarSign, Plus, FileText, Trash2 } from "lucide-react";
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
    status: "submitted",
    grantType: "Local",
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
    reportingIntervalMonths: "",
    collaborators: "",
  });

  const [linkedSdrs, setLinkedSdrs] = useState<number[]>([]);
  const [showAddReport, setShowAddReport] = useState(false);

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

  const { data: progressReports = [] } = useQuery({
    queryKey: [`/api/grants/${grantId}/progress-reports`],
    enabled: !!grantId,
  });


  // Load linked SDRs once
  useEffect(() => {
    if (grantSdrs) {
      setLinkedSdrs(grantSdrs.map((sdr: any) => sdr.id));
    }
  }, [grantSdrs?.length]);

  const updateGrantMutation = useMutation({
    mutationFn: async (data: any) => {
      // First update the grant
      const response = await fetch(`/api/grants/${grantId}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update grant');
      }

      // Then handle SDR links - remove all existing links and add new ones
      const currentLinkedResponse = await fetch(`/api/grants/${grantId}/research-activities`);
      const currentLinked = await currentLinkedResponse.json();
      
      // Remove all existing links
      for (const linkedSdr of currentLinked) {
        await fetch(`/api/grants/${grantId}/research-activities/${linkedSdr.id}`, {
          method: 'DELETE',
        });
      }
      
      // Add new links
      for (const sdrId of linkedSdrs) {
        await fetch(`/api/grants/${grantId}/research-activities/${sdrId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/grants'] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${grantId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${grantId}/research-activities`] });
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
    
    const collaborators = Array.isArray(grant?.collaborators) 
      ? grant.collaborators 
      : formData.collaborators 
        ? formData.collaborators.split('\n').filter(line => line.trim())
        : [];

    const payload = {
      projectNumber: grant?.projectNumber || formData.projectNumber,
      title: grant?.title || formData.title,
      description: grant?.description || formData.description,
      cycle: grant?.cycle || formData.cycle,
      status: grant?.status || formData.status,
      grantType: grant?.grantType || formData.grantType,
      fundingAgency: grant?.fundingAgency || formData.fundingAgency,
      investigatorType: grant?.investigatorType || formData.investigatorType,
      lpiId: grant?.lpiId || (formData.lpiId && formData.lpiId.trim() ? parseInt(formData.lpiId) : null),
      requestedAmount: grant?.requestedAmount || formData.requestedAmount || null,
      awardedAmount: grant?.awardedAmount || formData.awardedAmount || null,
      submittedYear: grant?.submittedYear || (formData.submittedYear && formData.submittedYear.trim() ? parseInt(formData.submittedYear) : null),
      awardedYear: grant?.awardedYear || (formData.awardedYear && formData.awardedYear.trim() ? parseInt(formData.awardedYear) : null),
      awarded: grant?.awarded !== undefined ? grant.awarded : formData.awarded,
      runningTimeYears: grant?.runningTimeYears || (formData.runningTimeYears && formData.runningTimeYears.trim() ? parseInt(formData.runningTimeYears) : null),
      currentGrantYear: grant?.currentGrantYear || formData.currentGrantYear || null, // Keep as string!
      startDate: grant?.startDate ? grant.startDate.split('T')[0] : formData.startDate || null,
      endDate: grant?.endDate ? grant.endDate.split('T')[0] : formData.endDate || null,
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
        {/* Basic Information - Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {/* First Row: Project Number, Status, Grant Type, Funding Agency */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Project Number
                </label>
                <Input
                  value={grant?.projectNumber || ""}
                  onChange={(e) => setFormData({...formData, projectNumber: e.target.value})}
                  placeholder="e.g., NIH-R01-123456"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Project Status
                </label>
                <Select
                  value={grant?.status || "submitted"}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Grant Type
                </label>
                <Select
                  value={grant?.grantType || "Local"}
                  onValueChange={(value) => setFormData({...formData, grantType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Funding Agency
                </label>
                <Input
                  value={grant?.fundingAgency || ""}
                  onChange={(e) => setFormData({...formData, fundingAgency: e.target.value})}
                  placeholder="e.g., NIH, NSF, DOE"
                />
              </div>
            </div>

            {/* Project Title - Full Width */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Project Title
              </label>
              <Input
                value={grant?.title || ""}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Grant title"
                required
              />
            </div>

            {/* Third Row: Lead Investigator, Investigator Type, Running Time, Current Year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Lead Investigator
                </label>
                <Select
                  value={grant?.lpiId?.toString() || ""}
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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Investigator Type
                </label>
                <Select
                  value={grant?.investigatorType || "Researcher"}
                  onValueChange={(value) => setFormData({...formData, investigatorType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Researcher">Researcher</SelectItem>
                    <SelectItem value="Clinician">Clinician</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Running Time (Years)
                </label>
                <Input
                  type="number"
                  value={grant?.runningTimeYears?.toString() || ""}
                  onChange={(e) => setFormData({...formData, runningTimeYears: e.target.value})}
                  placeholder="3"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Current Year
                </label>
                <Input
                  value={grant?.currentGrantYear?.toString() || ""}
                  onChange={(e) => setFormData({...formData, currentGrantYear: e.target.value})}
                  placeholder="Year 3 of 4"
                />
              </div>
            </div>

            {/* Fourth Row: Awarded Amount, Start Date, End Date, Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Awarded Amount
                </label>
                <Input
                  value={grant?.awardedAmount || ""}
                  onChange={(e) => setFormData({...formData, awardedAmount: e.target.value})}
                  placeholder="$626,565.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={grant?.startDate ? grant.startDate.split('T')[0] : ""}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={grant?.endDate ? grant.endDate.split('T')[0] : ""}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Cycle
                </label>
                <Input
                  value={grant?.cycle || ""}
                  onChange={(e) => setFormData({...formData, cycle: e.target.value})}
                  placeholder="e.g., 2024-1"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Description
              </label>
              <Textarea
                value={grant?.description || ""}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Requested Amount
                </label>
                <Input
                  value={grant?.requestedAmount || ""}
                  onChange={(e) => setFormData({...formData, requestedAmount: e.target.value})}
                  placeholder="$0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Submitted Year
                </label>
                <Input
                  type="number"
                  value={grant?.submittedYear?.toString() || ""}
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
                  value={grant?.awardedYear?.toString() || ""}
                  onChange={(e) => setFormData({...formData, awardedYear: e.target.value})}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Grant Awarded</label>
              </div>
              <Switch
                checked={grant?.awarded || false}
                onCheckedChange={(checked) => setFormData({...formData, awarded: checked})}
              />
            </div>

            {/* SDR Linking Section - Only show when grant is awarded */}
            {grant?.awarded && (
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

        {/* Collaborators & Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Collaborators & Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Reporting Interval (months)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={grant?.reportingIntervalMonths || ""}
                  onChange={(e) => setFormData({...formData, reportingIntervalMonths: parseInt(e.target.value) || null})}
                  placeholder="e.g., 12 for annual reports"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Collaborators (one per line)
              </label>
              <Textarea
                value={Array.isArray(grant?.collaborators) ? grant.collaborators.join('\n') : ""}
                onChange={(e) => setFormData({...formData, collaborators: e.target.value})}
                placeholder="Dr. John Smith, University of Example&#10;Dr. Jane Doe, Research Institute&#10;..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Progress Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Progress Reports
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddReport(true)}
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressReports && progressReports.length > 0 ? (
              <div className="space-y-4">
                {progressReports.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-medium text-gray-900">{report.reportTitle}</h4>
                        <span className="text-sm text-gray-500">{report.reportPeriod}</span>
                      </div>
                      <div className="flex gap-6 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Submitted: </span>
                          {report.submissionDate ? new Date(report.submissionDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Accepted: </span>
                          {report.acceptanceDate ? new Date(report.acceptanceDate).toLocaleDateString() : 'Pending'}
                        </div>
                      </div>
                      {report.notes && (
                        <div className="text-sm text-gray-500 mt-1">{report.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {report.filePath && (
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View PDF
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No progress reports uploaded yet. Add your first report to get started.
              </p>
            )}
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