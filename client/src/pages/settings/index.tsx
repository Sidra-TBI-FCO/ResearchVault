import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Settings as SettingsIcon, Moon, Sun, MessageSquarePlus, Send, Lightbulb, Zap, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { useTheme, themes } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for feature requests
interface FeatureRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  originalRequest: string;
  enhancedPrompt?: string;
  approvedPrompt?: string;
  aiProvider?: string;
  implementationNotes?: string;
  estimatedEffort?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const aiProviders = [
  { id: 'groq', name: 'Groq (Fast & Free)', description: 'High-speed inference with free tier' },
  { id: 'huggingface', name: 'HuggingFace', description: 'Open source models' },
  { id: 'together_ai', name: 'Together AI', description: 'Collaborative AI platform' }
];

const categoryOptions = [
  { value: 'ui', label: 'User Interface', icon: '🎨' },
  { value: 'backend', label: 'Backend', icon: '⚙️' },
  { value: 'feature', label: 'New Feature', icon: '✨' },
  { value: 'bugfix', label: 'Bug Fix', icon: '🐛' },
  { value: 'enhancement', label: 'Enhancement', icon: '🔧' }
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
];

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  { value: 'enhanced', label: 'AI Enhanced', icon: Lightbulb, color: 'bg-blue-100 text-blue-800' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'implemented', label: 'Implemented', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Rejected', icon: X, color: 'bg-red-100 text-red-800' }
];

export default function Settings() {
  const { mode, themeName, setMode, setTheme, toggleMode } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Feature request form state
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'feature',
    priority: 'medium',
    tags: ''
  });
  
  const [selectedAiProvider, setSelectedAiProvider] = useState(aiProviders[0].id);
  const [enhancingRequest, setEnhancingRequest] = useState<number | null>(null);

  // React Query hooks for feature requests
  const { data: featureRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/feature-requests'],
    queryFn: () => fetch('/api/feature-requests').then(res => res.json()) as Promise<FeatureRequest[]>
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/feature-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-requests'] });
      setRequestForm({ title: '', description: '', category: 'feature', priority: 'medium', tags: '' });
      toast({ title: "Feature request submitted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
    }
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/feature-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-requests'] });
      toast({ title: "Feature request updated successfully!" });
    }
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/feature-requests/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feature-requests'] });
      toast({ title: "Feature request deleted successfully!" });
    }
  });

  // Form handlers
  const handleSubmitRequest = () => {
    if (!requestForm.title.trim() || !requestForm.description.trim()) {
      toast({ title: "Please fill in title and description", variant: "destructive" });
      return;
    }

    const tags = requestForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    createRequestMutation.mutate({
      title: requestForm.title,
      description: requestForm.description,
      category: requestForm.category,
      priority: requestForm.priority,
      originalRequest: requestForm.description,
      tags
    });
  };

  const handleEnhanceRequest = async (request: FeatureRequest) => {
    setEnhancingRequest(request.id);
    
    // Simulate AI enhancement (replace with actual AI service call)
    setTimeout(() => {
      const enhancedPrompt = generateEnhancedPrompt(request);
      updateRequestMutation.mutate({
        id: request.id,
        data: {
          enhancedPrompt,
          aiProvider: selectedAiProvider,
          status: 'enhanced'
        }
      });
      setEnhancingRequest(null);
    }, 2000);
  };

  const generateEnhancedPrompt = (request: FeatureRequest) => {
    return `# Developer Prompt - IRIS Feature Request

## Context
IRIS (Intelligent Research Information Management System) is a research management platform built with:
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Express.js + Node.js + PostgreSQL
- Database: Drizzle ORM with type-safe operations

## User Request
**Title:** ${request.title}
**Category:** ${request.category}
**Priority:** ${request.priority}
**Description:** ${request.description}

## Implementation Requirements
1. **Technical Approach**: Implement using existing architecture patterns
2. **UI Components**: Use shadcn/ui components with consistent theming
3. **Data Layer**: Add necessary database schema and API endpoints
4. **Integration**: Follow existing code patterns and conventions

## Acceptance Criteria
- [ ] Feature works as described
- [ ] Follows existing UI/UX patterns
- [ ] Includes proper error handling
- [ ] Database changes use Drizzle ORM
- [ ] API endpoints follow REST conventions
- [ ] TypeScript types are properly defined

## Files Likely to be Modified
- Database schema: \`shared/schema.ts\`
- API routes: \`server/routes.ts\`
- Frontend pages: \`client/src/pages/\`
- UI components: \`client/src/components/\`

*Generated by IRIS AI Assistant using ${selectedAiProvider.toUpperCase()}*`;
  };

  const themeOptions = [
    {
      id: "sidra",
      name: themes.sidra.name,
      description: "Current teal and green palette",
      preview: "bg-gradient-to-r from-teal-500 to-emerald-500"
    },
    {
      id: "qbri",
      name: themes.qbri.name,
      description: "Qatar Biomedical Research Institute blue palette",
      preview: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-800"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-neutral-400" />
        <h1 className="text-2xl font-semibold text-neutral-400">Settings</h1>
      </div>

      <Tabs defaultValue="layout-theme" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-2">
          <TabsTrigger value="layout-theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Layout & Theme
          </TabsTrigger>
          <TabsTrigger value="feature-requests" className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Feature Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout-theme" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme-selector">Application Theme</Label>
                  <Select value={themeName} onValueChange={setTheme}>
                    <SelectTrigger id="theme-selector">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {themeOptions.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded ${theme.preview}`}></div>
                            <div>
                              <div className="font-medium">{theme.name}</div>
                              <div className="text-sm text-muted-foreground">{theme.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme Preview */}
                <div className="space-y-2">
                  <Label>Theme Preview</Label>
                  <div className="border rounded-lg p-4 space-y-3">
                    {themeOptions.map((theme) => (
                      theme.id === themeName && (
                        <div key={theme.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{theme.name}</span>
                            <div className={`w-6 h-6 rounded ${theme.preview}`}></div>
                          </div>
                          <div className="text-sm text-muted-foreground">{theme.description}</div>
                          {theme.id === "qbri" && (
                            <div className="text-xs text-blue-600">
                              Features geometric patterns inspired by QBRI's visual identity
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {mode === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Switch between light and dark themes
                    </div>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={mode === 'dark'}
                    onCheckedChange={toggleMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Current Settings</Label>
                  <div className="text-sm space-y-1">
                    <div>Theme: <span className="font-medium">{themeOptions.find(t => t.id === themeName)?.name}</span></div>
                    <div>Mode: <span className="font-medium">{mode === 'dark' ? 'Dark' : 'Light'}</span></div>
                    <div>App: <span className="font-medium">IRIS: Intelligent Research Information Management System</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Info */}
          <Card>
            <CardHeader>
              <CardTitle>Application Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Application Name</div>
                  <div>IRIS: Intelligent Research Information Management System</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Current Theme</div>
                  <div>{themeOptions.find(t => t.id === themeName)?.name}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Display Mode</div>
                  <div>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature-requests" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Submit New Request */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5" />
                  Submit Feature Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="request-title">Title</Label>
                  <Input
                    id="request-title"
                    placeholder="Brief description of the feature"
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="request-description">Description</Label>
                  <Textarea
                    id="request-description"
                    placeholder="Detailed description of what you need..."
                    className="min-h-[100px]"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="request-category">Category</Label>
                    <Select value={requestForm.category} onValueChange={(value) => setRequestForm({ ...requestForm, category: value })}>
                      <SelectTrigger id="request-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="request-priority">Priority</Label>
                    <Select value={requestForm.priority} onValueChange={(value) => setRequestForm({ ...requestForm, priority: value })}>
                      <SelectTrigger id="request-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="request-tags">Tags (comma-separated)</Label>
                  <Input
                    id="request-tags"
                    placeholder="dashboard, export, automation"
                    value={requestForm.tags}
                    onChange={(e) => setRequestForm({ ...requestForm, tags: e.target.value })}
                  />
                </div>

                <Button 
                  onClick={handleSubmitRequest} 
                  className="w-full bg-primary" 
                  disabled={createRequestMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </CardContent>
            </Card>

            {/* AI Enhancement Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Enhancement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ai-provider">AI Provider</Label>
                  <Select value={selectedAiProvider} onValueChange={setSelectedAiProvider}>
                    <SelectTrigger id="ai-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">{provider.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-600">How it works</div>
                      <div className="text-blue-600/80 mt-1">
                        AI analyzes your request and generates a detailed developer prompt with technical requirements, 
                        implementation suggestions, and acceptance criteria based on IRIS architecture.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Request Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusOptions.map((status) => {
                    const count = featureRequests.filter(req => req.status === status.value).length;
                    const Icon = status.icon;
                    return (
                      <div key={status.value} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{status.label}</span>
                        </div>
                        <Badge variant="outline" className={status.color}>
                          {count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : featureRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No feature requests yet. Submit your first request above!
                </div>
              ) : (
                <div className="space-y-4">
                  {featureRequests.map((request) => {
                    const statusInfo = statusOptions.find(s => s.value === request.status);
                    const priorityInfo = priorityOptions.find(p => p.value === request.priority);
                    const categoryInfo = categoryOptions.find(c => c.value === request.category);
                    const StatusIcon = statusInfo?.icon || Clock;

                    return (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{request.title}</h3>
                              <Badge variant="outline" className={statusInfo?.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo?.label}
                              </Badge>
                              <Badge variant="outline" className={priorityInfo?.color}>
                                {priorityInfo?.label}
                              </Badge>
                              <Badge variant="outline">
                                {categoryInfo?.icon} {categoryInfo?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                            {request.tags && (
                              <div className="flex gap-1 flex-wrap">
                                {request.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            {request.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleEnhanceRequest(request)}
                                disabled={enhancingRequest === request.id}
                                className="bg-primary"
                              >
                                <Lightbulb className="h-4 w-4 mr-1" />
                                {enhancingRequest === request.id ? 'Enhancing...' : 'Enhance'}
                              </Button>
                            )}
                            
                            {request.enhancedPrompt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(request.enhancedPrompt!);
                                  toast({ title: "Prompt copied to clipboard!" });
                                }}
                              >
                                Copy Prompt
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteRequestMutation.mutate(request.id)}
                              disabled={deleteRequestMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {request.enhancedPrompt && (
                          <div className="mt-3 p-3 bg-muted rounded border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">AI-Enhanced Developer Prompt</span>
                              <Badge variant="outline" className="text-xs">
                                {request.aiProvider?.toUpperCase()}
                              </Badge>
                            </div>
                            <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">
                              {request.enhancedPrompt}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}