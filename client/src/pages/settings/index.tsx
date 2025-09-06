import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Settings as SettingsIcon, Eye, EyeOff } from "lucide-react";

interface SystemConfiguration {
  id: number;
  key: string;
  value: any;
  description: string;
  category: string;
  isUserConfigurable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OcrConfig {
  provider: 'tesseract' | 'ocr_space';
  ocrSpaceApiKey?: string;
  tesseractOptions?: {
    language: string;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch OCR configuration
  const { data: ocrConfig, isLoading } = useQuery<SystemConfiguration>({
    queryKey: ['/api/system-configurations/ocr_service'],
  });

  const currentConfig: OcrConfig = ocrConfig?.value || { provider: 'tesseract' };

  // Update OCR configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<OcrConfig>) => {
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      if (ocrConfig) {
        // Update existing configuration
        const response = await apiRequest('PUT', `/api/system-configurations/ocr_service`, {
          value: updatedConfig,
          updatedAt: new Date()
        });
        return response.json();
      } else {
        // Create new configuration
        const response = await apiRequest('POST', '/api/system-configurations', {
          key: 'ocr_service',
          value: updatedConfig,
          description: 'OCR service configuration - choose between Tesseract.js (free) or OCR.space (external API)',
          category: 'ocr',
          isUserConfigurable: true
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-configurations/ocr_service'] });
      toast({
        title: "Configuration Updated",
        description: "OCR service configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update OCR configuration.",
        variant: "destructive",
      });
    },
  });

  const handleProviderChange = (provider: string) => {
    updateConfigMutation.mutate({ provider: provider as 'tesseract' | 'ocr_space' });
  };

  const handleApiKeyChange = (apiKey: string) => {
    updateConfigMutation.mutate({ ocrSpaceApiKey: apiKey });
  };

  const handleLanguageChange = (language: string) => {
    updateConfigMutation.mutate({
      tesseractOptions: { language }
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading configuration...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-2">Configure system-wide settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* OCR Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              OCR Service Configuration
            </CardTitle>
            <CardDescription>
              Choose between different OCR providers for processing CITI certificates and other documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">OCR Provider</Label>
              <RadioGroup
                value={currentConfig.provider}
                onValueChange={handleProviderChange}
                disabled={updateConfigMutation.isPending}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="tesseract" id="tesseract" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="tesseract" className="font-medium cursor-pointer">
                          Tesseract.js (Recommended)
                        </Label>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Free, open-source OCR that runs locally. No API limits or external dependencies.
                        Processes documents entirely within your system.
                      </p>
                      <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mt-2 inline-block">
                        ✓ Completely free • ✓ No rate limits • ✓ Privacy-focused
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="ocr_space" id="ocr_space" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="ocr_space" className="font-medium cursor-pointer">
                          OCR.space
                        </Label>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        External API service with high accuracy. Free tier: 500 requests/day.
                        Requires internet connection and sends data to external servers.
                      </p>
                      <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2 inline-block">
                        ⚠ Usage limits • ⚠ External service • ⚠ Data privacy considerations
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* OCR.space API Key Configuration */}
            {currentConfig.provider === 'ocr_space' && (
              <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <Label htmlFor="api-key" className="text-base font-medium">
                  OCR.space API Key
                </Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={currentConfig.ocrSpaceApiKey || ""}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter your OCR.space API key (or leave blank for free tier)"
                    disabled={updateConfigMutation.isPending}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-orange-700">
                  Free tier uses "helloworld" key with 500 requests/day limit. 
                  Get your own API key at <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer" className="underline">ocr.space</a> for higher limits.
                </p>
              </div>
            )}

            {/* Tesseract Language Configuration */}
            {currentConfig.provider === 'tesseract' && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Label htmlFor="language" className="text-base font-medium">
                  Recognition Language
                </Label>
                <Input
                  id="language"
                  value={currentConfig.tesseractOptions?.language || "eng"}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  placeholder="Language code (e.g., eng, fra, deu)"
                  disabled={updateConfigMutation.isPending}
                />
                <p className="text-sm text-green-700">
                  Language for text recognition. Use "eng" for English, "fra" for French, "deu" for German, etc.
                </p>
              </div>
            )}

            {/* Save Status */}
            {updateConfigMutation.isPending && (
              <div className="text-sm text-blue-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                Saving configuration...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
            <CardDescription>Summary of active OCR settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Active Provider</Label>
                <p className="text-lg font-semibold capitalize">
                  {currentConfig.provider === 'tesseract' ? 'Tesseract.js (Free)' : 'OCR.space'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                <p className={`text-lg font-semibold ${
                  currentConfig.provider === 'tesseract' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {currentConfig.provider === 'tesseract' ? 'Ready' : 'External Service'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}