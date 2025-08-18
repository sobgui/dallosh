"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Database, Shield, Zap } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";

interface DatabaseSettings {
  name: string;
  description: string;
  max_tables: number;
  max_documents_per_table: number;
  enable_auth: boolean;
  enable_realtime: boolean;
  backup_enabled: boolean;
  backup_frequency: string;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<DatabaseSettings>({
    name: "primary",
    description: "Primary database for the application",
    max_tables: 100,
    max_documents_per_table: 10000,
    enable_auth: true,
    enable_realtime: false,
    backup_enabled: true,
    backup_frequency: "daily"
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const client = getSodularClient();
      // For now, we'll use default settings since the API might not have settings endpoint
      // In a real implementation, you would fetch from: await client.getDatabaseSettings();
      
      // Mock settings for demonstration
      setSettings({
        name: "primary",
        description: "Primary database for the application",
        max_tables: 100,
        max_documents_per_table: 10000,
        enable_auth: true,
        enable_realtime: false,
        backup_enabled: true,
        backup_frequency: "daily"
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to fetch database settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const client = getSodularClient();
      // In a real implementation: await client.updateDatabaseSettings(settings);
      
      // Mock save for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setSettings({
        name: "primary",
        description: "Primary database for the application",
        max_tables: 100,
        max_documents_per_table: 10000,
        enable_auth: true,
        enable_realtime: false,
        backup_enabled: true,
        backup_frequency: "daily"
      });
      toast.success("Settings reset to defaults");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">Loading database settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Basic configuration for the primary database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Database Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Primary database name cannot be changed
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits & Quotas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5" />
            Limits & Quotas
          </CardTitle>
          <CardDescription>
            Set resource limits for the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_tables">Maximum Tables</Label>
              <Input
                id="max_tables"
                type="number"
                value={settings.max_tables}
                onChange={(e) => setSettings({ ...settings, max_tables: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_documents">Max Documents per Table</Label>
              <Input
                id="max_documents"
                type="number"
                value={settings.max_documents_per_table}
                onChange={(e) => setSettings({ ...settings, max_documents_per_table: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure authentication and security features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require authentication for database access
              </p>
            </div>
            <Switch
              checked={settings.enable_auth}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_auth: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Real-time Updates</Label>
              <p className="text-sm text-muted-foreground">
                Enable real-time data synchronization
              </p>
            </div>
            <Switch
              checked={settings.enable_realtime}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_realtime: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Settings</CardTitle>
          <CardDescription>
            Configure automatic backups for data protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automatic Backups</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup database data
              </p>
            </div>
            <Switch
              checked={settings.backup_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, backup_enabled: checked })}
            />
          </div>
          {settings.backup_enabled && (
            <div className="space-y-2">
              <Label htmlFor="backup_frequency">Backup Frequency</Label>
              <select
                id="backup_frequency"
                value={settings.backup_frequency}
                onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reset Settings</p>
              <p className="text-sm text-muted-foreground">
                Reset all settings to their default values
              </p>
            </div>
            <Button variant="outline" onClick={handleResetSettings}>
              Reset Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2">
        <Button variant="outline" onClick={fetchSettings}>
          Cancel
        </Button>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
