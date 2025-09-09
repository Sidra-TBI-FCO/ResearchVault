import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { useTheme, themes } from "@/contexts/ThemeContext";

export default function Settings() {
  const { mode, themeName, setMode, setTheme, toggleMode } = useTheme();

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
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-4">
          <TabsTrigger value="layout-theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Layout & Theme
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
      </Tabs>
    </div>
  );
}