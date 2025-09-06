import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Settings, Upload, FileText, Check, X, AlertTriangle, Plus, History, Filter } from "lucide-react";
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
  status: 'detected' | 'unrecognized' | 'error' | 'unknown' | 'processing' | 'ocr_failed';
  extractedText?: string;
  name?: string;
  courseName?: string;
  module?: CertificationModule | null;
  completionDate?: string;
  expirationDate?: string;
  recordId?: string;
  institution?: string;
  isNewModule?: boolean;
  error?: string;
}

interface PendingCertification extends DetectedCertificate {
  scientistId?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

interface PdfImportHistoryEntry {
  id: number;
  fileName: string;
  fileUrl: string;
  uploadedBy: number;
  assignedScientistId?: number;
  extractedText?: string;
  extractedData?: any;
  processingStatus: 'processing' | 'completed' | 'failed';
  ocrProvider: string;
  errorMessage?: string;
  processingTimeMs?: number;
  uploadedAt: string;
  processedAt?: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  assignedScientist?: {
    id: number;
    name: string;
    email: string;
  };
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
  
  // PDF import history state
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyDateFrom, setHistoryDateFrom] = useState<string>("");
  const [historyDateTo, setHistoryDateTo] = useState<string>("");
  
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

  const { data: ocrConfig } = useQuery({
    queryKey: ['/api/system-configurations/ocr_service'],
  });

  // PDF import history query
  const { data: pdfHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/pdf-import-history', {
      scientistName: historySearchTerm,
      status: historyStatusFilter === 'all' ? '' : historyStatusFilter,
      dateFrom: historyDateFrom,
      dateTo: historyDateTo
    }],
    enabled: activeTab === 'history'
  });

  const processCertificatesMutation = useMutation({
    mutationFn: async (fileUrls: string[]) => {
      const response = await apiRequest('POST', '/api/certificates/process-batch', { fileUrls });
      return response.json();
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
      const response = await apiRequest('POST', '/api/certificates/confirm-batch', { certifications });
      return response.json();
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

    // Create scientist lookup map for job titles
    const scientistLookup = new Map();
    scientists.forEach((scientist: any) => {
      scientistLookup.set(scientist.id, scientist);
    });

    // Get unique scientists
    const scientistMap = new Map();
    matrixData.forEach((item: CertificationMatrixItem) => {
      if (!scientistMap.has(item.scientistId)) {
        const scientistData = scientistLookup.get(item.scientistId);
        scientistMap.set(item.scientistId, {
          id: item.scientistId,
          name: item.scientistName,
          jobTitle: scientistData?.jobTitle || null,
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
  }, [matrixData, scientists]);

  // Filter scientists based on search term
  const filteredScientists = useMemo(() => {
    if (!searchTerm) return matrixScientists;
    const term = searchTerm.toLowerCase();
    return matrixScientists.filter((scientist: any) =>
      scientist.name.toLowerCase().includes(term) ||
      (scientist.jobTitle && scientist.jobTitle.toLowerCase().includes(term))
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-sidra-primary">Certification Management</h1>
            {ocrConfig && (
              <Badge variant="secondary" className="text-xs">
                OCR: {ocrConfig.value === 'tesseract' ? 'Tesseract.js (Local)' : 'OCR.space (API)'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage CITI certifications and compliance requirements for research staff
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="matrix" className="flex items-center gap-1 px-2 text-xs md:text-sm">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">CITI </span>Matrix
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-1 px-2 text-xs md:text-sm">
            <Upload className="h-3 w-3 md:h-4 md:w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 px-2 text-xs md:text-sm">
            <History className="h-3 w-3 md:h-4 md:w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-1 px-2 text-xs md:text-sm">
            <Settings className="h-3 w-3 md:h-4 md:w-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1 px-2 text-xs md:text-sm">
            <Settings className="h-3 w-3 md:h-4 md:w-4" />
            Config
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
                          <div>
                            <div>{scientist.name}</div>
                            {scientist.jobTitle && (
                              <div className="text-xs text-gray-500 mt-1">{scientist.jobTitle}</div>
                            )}
                          </div>
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
                onComplete={(uploadedFiles) => {
                  try {
                    if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
                      toast({
                        title: "Upload error",
                        description: "No files were successfully uploaded",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const fileUrls = uploadedFiles.map(file => file.url);
                    
                    if (fileUrls.length > 0) {
                      setIsProcessing(true);
                      processCertificatesMutation.mutate(fileUrls);
                      setIsProcessing(false);
                    } else {
                      toast({
                        title: "No files to process",
                        description: "No valid file URLs found from upload",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error('Upload processing error:', error);
                    toast({
                      title: "Upload processing failed",
                      description: "There was an error processing the uploaded files",
                      variant: "destructive",
                    });
                  }
                }}
                showDropzone={true}
              />
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Free OCR-Powered Upload</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload CITI certificates or completion reports (PDF format)</li>
                  <li>• Open-source OCR automatically extracts names, dates, courses, and record IDs</li>
                  <li>• Completely free - no API limits or external service dependencies</li>
                  <li>• Review extracted data and assign to scientists before saving</li>
                  <li>• Maximum 10 files per upload, 10MB each</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {detectedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>OCR Processing Results</CardTitle>
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
                          f.status === 'detected' && f.name && f.scientistId && f.startDate && f.endDate && f.module
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
                        <TableHead>Extracted Name</TableHead>
                        <TableHead>Course/Module</TableHead>
                        <TableHead>Completion Date</TableHead>
                        <TableHead>Record ID</TableHead>
                        <TableHead>Assign to Scientist</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
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
                                OCR Success
                              </Badge>
                            ) : file.status === 'ocr_failed' ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                <X className="h-3 w-3 mr-1" />
                                OCR Failed
                              </Badge>
                            ) : file.status === 'processing' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Processing...
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Unknown
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-48 truncate" title={file.fileName}>
                            {file.fileName}
                          </TableCell>
                          <TableCell className="max-w-40">
                            {file.name ? (
                              <span className="text-sm font-medium text-green-700" title={file.name}>
                                {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-40">
                            {file.module ? (
                              <span className="text-sm text-green-600">{file.module.name}</span>
                            ) : file.courseName ? (
                              <span className="text-sm text-amber-600" title={file.courseName}>
                                {file.courseName.length > 25 ? `${file.courseName.substring(0, 25)}...` : file.courseName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {file.completionDate ? (
                              <span className="text-sm text-blue-600">{file.completionDate}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {file.recordId ? (
                              <span className="text-sm font-mono text-purple-600">{file.recordId}</span>
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
                              value={file.startDate || file.completionDate || ""}
                              onChange={(e) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], startDate: e.target.value };
                                setDetectedFiles(updated);
                              }}
                              className="w-36"
                              placeholder="Start date"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={file.endDate || file.expirationDate || ""}
                              onChange={(e) => {
                                const updated = [...detectedFiles];
                                updated[index] = { ...updated[index], endDate: e.target.value };
                                setDetectedFiles(updated);
                              }}
                              className="w-36"
                              placeholder="End date"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updated = detectedFiles.filter((_, i) => i !== index);
                                  setDetectedFiles(updated);
                                }}
                              >
                                Remove
                              </Button>
                              {file.extractedText && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    alert(`OCR Extracted Text:\n\n${file.extractedText?.substring(0, 800)}${file.extractedText && file.extractedText.length > 800 ? '...' : ''}`);
                                  }}
                                >
                                  View OCR
                                </Button>
                              )}
                            </div>
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

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>PDF Import History</CardTitle>
                <Button 
                  onClick={() => refetchHistory()} 
                  variant="outline" 
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <p className="text-muted-foreground">
                View and search PDF processing history with OCR extraction results
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Staff/Course</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or course..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date From</label>
                  <Input
                    type="date"
                    value={historyDateFrom}
                    onChange={(e) => setHistoryDateFrom(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date To</label>
                  <Input
                    type="date"
                    value={historyDateTo}
                    onChange={(e) => setHistoryDateTo(e.target.value)}
                  />
                </div>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sidra-primary"></div>
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>OCR Provider</TableHead>
                        <TableHead>Processing Time</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Processed Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pdfHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No PDF import history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        pdfHistory.map((entry: PdfImportHistoryEntry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono text-sm max-w-48 truncate" title={entry.fileName}>
                              {entry.fileName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  entry.processingStatus === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : entry.processingStatus === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }
                              >
                                {entry.processingStatus === 'completed' && <Check className="h-3 w-3 mr-1" />}
                                {entry.processingStatus === 'failed' && <X className="h-3 w-3 mr-1" />}
                                {entry.processingStatus === 'processing' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {entry.processingStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.uploader ? entry.uploader.name : 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {entry.ocrProvider}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.processingTimeMs ? `${entry.processingTimeMs}ms` : '-'}
                            </TableCell>
                            <TableCell>
                              {format(parseISO(entry.uploadedAt), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {entry.processedAt ? format(parseISO(entry.processedAt), 'MMM dd, yyyy HH:mm') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(entry.fileUrl, '_blank')}
                                >
                                  View PDF
                                </Button>
                                {entry.extractedText && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      alert(`OCR Extracted Text:\n\n${entry.extractedText?.substring(0, 800)}${entry.extractedText && entry.extractedText.length > 800 ? '...' : ''}`);
                                    }}
                                  >
                                    View OCR
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">PDF Import History</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Track all PDF uploads and OCR processing results</li>
                  <li>• Search by staff names, course names, or date ranges</li>
                  <li>• View processing status and performance metrics</li>
                  <li>• Access original PDFs and extracted OCR text</li>
                  <li>• Filter by processing status (completed, failed, processing)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
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