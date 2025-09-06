import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Settings, Upload, FileText, Check, X, AlertTriangle, Plus } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CertificationMatrixItem {
  scientistId: number;
  scientistName: string;
  moduleId: number;
  moduleName: string;
  certificationId: number | null;
  startDate: string | null;
  endDate: string | null;
  certificateFilePath: string | null;
  reportFilePath: string | null;
}

interface CertificationModule {
  id: number;
  name: string;
  description: string;
  isCore: boolean;
  expirationMonths: number;
  isActive: boolean;
}

interface DetectedCertificate {
  fileName: string;
  filePath: string;
  originalUrl: string;
  status: 'detected' | 'unrecognized' | 'error' | 'unknown';
  moduleAbbreviation?: string;
  year?: number;
  module?: CertificationModule | null;
  isNewModule?: boolean;
  error?: string;
}

interface PendingCertification extends DetectedCertificate {
  scientistId?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

function getCertificationStatus(endDate: string | null): {
  status: 'valid' | 'expiring' | 'expired' | 'never';
  color: string;
  text: string;
} {
  if (!endDate) {
    return { status: 'never', color: 'bg-gray-100 text-gray-600', text: 'Never' };
  }

  const end = parseISO(endDate);
  const today = new Date();
  const daysUntilExpiry = differenceInDays(end, today);

  if (daysUntilExpiry < 0) {
    return { status: 'expired', color: 'bg-red-100 text-red-800', text: 'Expired' };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring', color: 'bg-orange-100 text-orange-800', text: 'Expiring' };
  } else {
    return { status: 'valid', color: 'bg-green-100 text-green-800', text: 'Valid' };
  }
}

export default function CertificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("matrix");
  const [detectedFiles, setDetectedFiles] = useState<PendingCertification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matrixData = [], isLoading: matrixLoading } = useQuery({
    queryKey: ['/api/certifications/matrix'],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['/api/certification-modules'],
  });

  const { data: scientists = [] } = useQuery({
    queryKey: ['/api/scientists'],
  });

  const processCertificatesMutation = useMutation({
    mutationFn: async (fileUrls: string[]) => {
      return apiRequest('/api/certificates/process-batch', {
        method: 'POST',
        body: { fileUrls }
      });
    },
    onSuccess: (data) => {
      setDetectedFiles(data.results.map((result: DetectedCertificate) => ({
        ...result,
        scientistId: undefined,
        startDate: '',
        endDate: '',
        notes: ''
      })));
      toast({
        title: "Files processed",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const confirmCertificationsMutation = useMutation({
    mutationFn: async (certifications: PendingCertification[]) => {
      return apiRequest('/api/certificates/confirm-batch', {
        method: 'POST',
        body: { certifications }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/certifications/matrix'] });
      setDetectedFiles([]);
      toast({
        title: "Certifications saved",
        description: `${data.summary.successful} certifications added successfully`,
      });
      if (data.summary.failed > 0) {
        toast({
          title: "Some certifications failed",
          description: `${data.summary.failed} certifications could not be processed`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Transform matrix data for table display
  const { matrixScientists, moduleHeaders } = useMemo(() => {
    if (!matrixData.length) return { matrixScientists: [], moduleHeaders: [] };

    // Get unique scientists
    const scientistMap = new Map();
    matrixData.forEach((item: CertificationMatrixItem) => {
      if (!scientistMap.has(item.scientistId)) {
        scientistMap.set(item.scientistId, {
          id: item.scientistId,
          name: item.scientistName,
          certifications: new Map(),
        });
      }
      
      scientistMap.get(item.scientistId).certifications.set(item.moduleId, item);
    });

    // Get unique modules
    const moduleMap = new Map();
    matrixData.forEach((item: CertificationMatrixItem) => {
      if (!moduleMap.has(item.moduleId)) {
        moduleMap.set(item.moduleId, {
          id: item.moduleId,
          name: item.moduleName,
        });
      }
    });

    return {
      matrixScientists: Array.from(scientistMap.values()),
      moduleHeaders: Array.from(moduleMap.values()),
    };
  }, [matrixData]);

  // Filter scientists based on search term
  const filteredScientists = useMemo(() => {
    if (!searchTerm) return matrixScientists;
    return matrixScientists.filter((scientist: any) =>
      scientist.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [matrixScientists, searchTerm]);

  const handleCellClick = async (certification: CertificationMatrixItem) => {
    if (!certification.certificationId) return;

    // Download the certificate or report file
    const filePath = certification.certificateFilePath || certification.reportFilePath;
    if (filePath) {
      window.open(filePath, '_blank');
    }
  };

  const exportToCSV = () => {
    const headers = ['Scientist', ...moduleHeaders.map((m: any) => m.name)];
    const csvContent = [
      headers.join(','),
      ...filteredScientists.map((scientist: any) => {
        const row = [scientist.name];
        moduleHeaders.forEach((module: any) => {
          const cert = scientist.certifications.get(module.id);
          const status = getCertificationStatus(cert?.endDate);
          row.push(status.text);
        });
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certification-matrix-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (matrixLoading || modulesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-sidra-primary">Certification Management</h1>
          <p className="text-muted-foreground">
            Manage CITI certifications and compliance requirements for research staff
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CITI Certification Matrix
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Certificates
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Modules
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Certification Status Matrix</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search scientists..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                  <span>Expiring (≤30 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                  <span>Expired</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>Never Completed</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white min-w-48">Scientist</TableHead>
                      {moduleHeaders.map((module: any) => (
                        <TableHead key={module.id} className="text-center min-w-32">
                          {module.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScientists.map((scientist: any) => (
                      <TableRow key={scientist.id}>
                        <TableCell className="sticky left-0 bg-white font-medium">
                          {scientist.name}
                        </TableCell>
                        {moduleHeaders.map((module: any) => {
                          const certification = scientist.certifications.get(module.id);
                          const status = getCertificationStatus(certification?.endDate);
                          
                          return (
                            <TableCell key={module.id} className="text-center">
                              <Badge
                                variant="secondary"
                                className={`cursor-pointer ${status.color} ${
                                  certification?.certificationId ? 'hover:opacity-80' : 'cursor-default'
                                }`}
                                onClick={() => certification?.certificationId && handleCellClick(certification)}
                              >
                                {status.text}
                                {certification?.endDate && (
                                  <div className="text-xs mt-1">
                                    {format(parseISO(certification.endDate), 'MM/dd/yyyy')}
                                  </div>
                                )}
                              </Badge>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Certificates</CardTitle>
              <p className="text-muted-foreground">
                Upload CITI certification PDFs for automatic processing and extraction of certification data.
              </p>
            </CardHeader>
            <CardContent>
              <ObjectUploader
                maxNumberOfFiles={10}
                maxFileSize={10485760} // 10MB
                acceptedFileTypes={['application/pdf']}
                onComplete={(result) => {
                  const fileUrls = result.successful.map((file: any) => file.uploadURL);
                  if (fileUrls.length > 0) {
                    setIsProcessing(true);
                    processCertificatesMutation.mutate(fileUrls);
                    setIsProcessing(false);
                  }
                }}
                showDropzone={true}
              />
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Upload Instructions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload either CITI certificates or completion reports (both contain the required information)</li>
                  <li>• Files will be automatically processed to extract certification details</li>
                  <li>• Review and verify the extracted data before saving</li>
                  <li>• Maximum 10 files per upload, 10MB each</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {detectedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detected Certificates</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setDetectedFiles([])}
                      variant="outline"
                      size="sm"
                    >
                      Clear All
                    </Button>
                    <Button 
                      onClick={() => {
                        const validCerts = detectedFiles.filter(f => 
                          f.status === 'detected' && f.scientistId && f.startDate && f.endDate && f.module
                        );
                        if (validCerts.length === 0) {
                          toast({
                            title: "No valid certifications",
                            description: "Please complete all required fields for at least one certification",
                            variant: "destructive",
                          });
                          return;
                        }
                        confirmCertificationsMutation.mutate(validCerts.map(cert => ({
                          ...cert,
                          moduleId: cert.module!.id,
                          certificateFilePath: cert.filePath
                        })));
                      }}
                      disabled={confirmCertificationsMutation.isPending}
                      size="sm"
                    >
                      {confirmCertificationsMutation.isPending ? 'Saving...' : 'Save All Valid'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Scientist</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectedFiles.map((file, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {file.status === 'detected' ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <Check className="h-3 w-3 mr-1" />
                                Detected
                              </Badge>
                            ) : file.status === 'unrecognized' ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Unknown
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                <X className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-48">
                            {file.fileName}
                          </TableCell>
                          <TableCell>
                            {file.isNewModule ? (
                              <Badge variant="outline" className="border-orange-500 text-orange-700">
                                <Plus className="h-3 w-3 mr-1" />
                                {file.moduleAbbreviation} (New)
                              </Badge>
                            ) : file.module ? (
                              <span className="text-sm">{file.module.name}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={file.scientistId?.toString() || ""}
                              onValueChange={(value) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], scientistId: parseInt(value) };
                                setDetectedFiles(updated);
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select scientist" />
                              </SelectTrigger>
                              <SelectContent>
                                {scientists.map((scientist: any) => (
                                  <SelectItem key={scientist.id} value={scientist.id.toString()}>
                                    {scientist.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={file.startDate || ""}
                              onChange={(e) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], startDate: e.target.value };
                                setDetectedFiles(updated);
                              }}
                              className="w-36"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={file.endDate || ""}
                              onChange={(e) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], endDate: e.target.value };
                                setDetectedFiles(updated);
                              }}
                              className="w-36"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Record ID, Score, etc."
                              value={file.notes || ""}
                              onChange={(e) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], notes: e.target.value };
                                setDetectedFiles(updated);
                              }}
                              className="w-48"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updated = detectedFiles.filter((_, i) => i !== index);
                                setDetectedFiles(updated);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certification Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module: CertificationModule) => (
                  <div key={module.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{module.name}</h3>
                        {module.isCore && (
                          <Badge variant="default" className="bg-sidra-primary text-white">
                            Core
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires every {module.expirationMonths} months
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>CITI API Configuration</CardTitle>
                <p className="text-muted-foreground">
                  Configure automatic data import from CITI Program
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Institution Name</label>
                  <Input placeholder="Your Institution Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Endpoint</label>
                  <Input placeholder="https://api.citiprogram.org/..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <Input type="password" placeholder="Enter API key" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Secret</label>
                  <Input type="password" placeholder="Enter API secret" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="auto-import" className="rounded" />
                  <label htmlFor="auto-import" className="text-sm">
                    Enable automatic daily import
                  </label>
                </div>
                <Button className="w-full">
                  Test Connection & Save
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <p className="text-muted-foreground">
                  Configure expiration alerts and reminders
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notification Recipients</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="notify-scientist" className="rounded" defaultChecked />
                      <label htmlFor="notify-scientist" className="text-sm">Scientist</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="notify-supervisor" className="rounded" defaultChecked />
                      <label htmlFor="notify-supervisor" className="text-sm">Line Manager</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="notify-admin" className="rounded" />
                      <label htmlFor="notify-admin" className="text-sm">Admin Office</label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reminder Schedule</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="remind-30" className="rounded" defaultChecked />
                      <label htmlFor="remind-30" className="text-sm">30 days before expiration</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="remind-7" className="rounded" defaultChecked />
                      <label htmlFor="remind-7" className="text-sm">7 days before expiration</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="remind-1" className="rounded" />
                      <label htmlFor="remind-1" className="text-sm">1 day before expiration</label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="email-enabled" className="rounded" defaultChecked />
                  <label htmlFor="email-enabled" className="text-sm">
                    Enable email notifications
                  </label>
                </div>

                <Button className="w-full" variant="outline">
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 border rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-sm">Object Storage</div>
                    <div className="text-xs text-muted-foreground">Connected</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <div>
                    <div className="font-medium text-sm">CITI API</div>
                    <div className="text-xs text-muted-foreground">Not Configured</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-sm">Database</div>
                    <div className="text-xs text-muted-foreground">Connected</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}