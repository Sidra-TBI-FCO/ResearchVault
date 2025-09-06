import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Settings, Upload, FileText } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const { data: matrixData = [], isLoading: matrixLoading } = useQuery({
    queryKey: ['/api/certifications/matrix'],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['/api/certification-modules'],
  });

  // Transform matrix data for table display
  const { scientists, moduleHeaders } = useMemo(() => {
    if (!matrixData.length) return { scientists: [], moduleHeaders: [] };

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
      scientists: Array.from(scientistMap.values()),
      moduleHeaders: Array.from(moduleMap.values()),
    };
  }, [matrixData]);

  // Filter scientists based on search term
  const filteredScientists = useMemo(() => {
    if (!searchTerm) return scientists;
    return scientists.filter((scientist: any) =>
      scientist.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [scientists, searchTerm]);

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
                maxNumberOfFiles={5}
                maxFileSize={10485760} // 10MB
                acceptedFileTypes={['application/pdf']}
                onComplete={(uploadedFiles) => {
                  console.log('Files uploaded:', uploadedFiles);
                  // TODO: Process uploaded files with OCR
                  toast({
                    title: "Files uploaded successfully",
                    description: `${uploadedFiles.length} file(s) uploaded and ready for processing`,
                  });
                }}
                showDropzone={true}
              />
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Upload Instructions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload either CITI certificates or completion reports (both contain the required information)</li>
                  <li>• Files will be automatically processed to extract certification details</li>
                  <li>• Review and verify the extracted data before saving</li>
                  <li>• Maximum 5 files per upload, 10MB each</li>
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
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Configuration Panel</h3>
                <p className="text-muted-foreground">
                  Configure CITI API settings, notification preferences, and system options.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}