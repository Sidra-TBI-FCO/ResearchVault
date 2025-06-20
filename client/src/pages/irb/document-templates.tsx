import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, ExternalLink } from "lucide-react";

export default function IrbDocumentTemplates() {
  const documentTemplates = [
    {
      id: "irb-400",
      title: "IRB-400 Informed Consent Form",
      version: "V2.1 - August 2023",
      description: "Standard template for informed consent forms in English. Must be completed for all studies involving human subjects.",
      category: "Required",
      downloadUrl: "/templates/IRB-400-Informed-Consent-Form-English-V2.1.docx",
      fillable: true
    },
    {
      id: "irb-413",
      title: "IRB-413 Clinical Research Protocol Template",
      version: "V2.0 - October 2023",
      description: "Comprehensive protocol template for clinical research studies. Includes all required sections for IRB review.",
      category: "Required",
      downloadUrl: "/templates/IRB-413-Clinical-Research-Protocol-Template-V2.0.docx",
      fillable: true
    },
    {
      id: "irb-412",
      title: "IRB-412 Closure Report Form",
      version: "V4.1 - February 2023",
      description: "Form to be submitted when requesting closure of a research study and providing final report to IRB.",
      category: "Study Lifecycle",
      downloadUrl: "/templates/IRB-412-Closure-Report-Form-V4.1.docx",
      fillable: true
    },
    {
      id: "irb-417",
      title: "IRB-417 Serious Adverse Event Report Form",
      version: "V1.2 - February 2023",
      description: "Report form for serious adverse events that occur during the study. Must be submitted within one week.",
      category: "Safety Reporting",
      downloadUrl: "/templates/IRB-417-Serious-Adverse-Events-Form-V1.2.docx",
      fillable: true
    },
    {
      id: "reliance-protocol",
      title: "Reliance Protocol Template",
      version: "V1.0",
      description: "Template for multi-site studies where Sidra IRB serves as the reviewing IRB for external sites.",
      category: "Multi-site Studies",
      downloadUrl: "/templates/Reliance-ProtocolTemplate-v1.docx",
      fillable: true
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Required":
        return "bg-red-100 text-red-700";
      case "Study Lifecycle":
        return "bg-blue-100 text-blue-700";
      case "Safety Reporting":
        return "bg-orange-100 text-orange-700";
      case "Multi-site Studies":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-400 mb-2">IRB Document Templates</h1>
        <p className="text-neutral-300">
          Download and complete the required forms for your IRB submission. All templates are provided by Sidra Medicine IRB Office.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Important Instructions</h3>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• Download the latest version of each required form</li>
              <li>• Complete all fillable fields before uploading to your submission</li>
              <li>• Save completed forms in PDF format for submission</li>
              <li>• Contact IRB office at irb@sidra.org for questions about form completion</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {documentTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{template.version}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={getCategoryColor(template.category)}
                >
                  {template.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {template.description}
              </p>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    const link = window.document.createElement('a');
                    link.href = template.downloadUrl;
                    link.download = template.downloadUrl.split('/').pop() || template.title;
                    window.document.body.appendChild(link);
                    link.click();
                    window.document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                
                {template.fillable && (
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Guide
                  </Button>
                )}
              </div>
              
              <div className="mt-3 text-xs text-gray-500">
                {template.fillable && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Fillable Word Document
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <h4 className="font-medium">IRB Submission Checklist</h4>
                <p className="text-sm text-gray-600">Complete checklist for IRB submissions</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <h4 className="font-medium">IRB Policies & Procedures</h4>
                <p className="text-sm text-gray-600">Complete policy document (POL-O-IRB)</p>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Online
              </Button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">Training Requirements</h4>
                <p className="text-sm text-gray-600">CITI Training modules for research personnel</p>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Access Training
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}