'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Bot, Bell, Shield } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    botName: "dallosh_bot",
    welcomeMessage: "Hello! I'm here to help. How can I assist you today?",
    autoResponse: true,
    maxResponseTime: "24",
    enableNotifications: true,
    enableAnalytics: true,
  });

  const handleSave = () => {
    // TODO: Implement settings save functionality
    console.log("Saving settings:", settings);
    alert("Settings saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure your Dallosh platform settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Bot Configuration */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 text-blue-400" />
            Bot Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure the AI assistant bot behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="botName" className="text-white">Bot Name</Label>
              <Input
                id="botName"
                value={settings.botName}
                onChange={(e) => setSettings(prev => ({ ...prev, botName: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="maxResponseTime" className="text-white">Max Response Time (hours)</Label>
              <Input
                id="maxResponseTime"
                type="number"
                value={settings.maxResponseTime}
                onChange={(e) => setSettings(prev => ({ ...prev, maxResponseTime: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="welcomeMessage" className="text-white">Welcome Message</Label>
            <Input
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Auto Response</Label>
              <p className="text-sm text-gray-400">Enable automatic bot responses</p>
            </div>
            <Switch
              checked={settings.autoResponse}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoResponse: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bell className="h-5 w-5 text-green-400" />
            Notification Settings
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Enable Notifications</Label>
              <p className="text-sm text-gray-400">Receive notifications for new requests</p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableNotifications: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Analytics Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-purple-400" />
            Analytics & Privacy
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure analytics and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Enable Analytics</Label>
              <p className="text-sm text-gray-400">Collect usage analytics for improvement</p>
            </div>
            <Switch
              checked={settings.enableAnalytics}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableAnalytics: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">System Information</CardTitle>
          <CardDescription className="text-gray-400">
            Platform version and system details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Platform Version:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated:</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Database Status:</span>
            <span className="text-green-400">Connected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
