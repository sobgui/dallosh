"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sketch } from '@uiw/react-color';
import { getSodularClient } from "@/services";

interface GeneralSettings {
  appName: string;
  appDescription: string;
  timezone: string;
  dateFormat: string;
  adminEmail: string;
  maintenanceMode: boolean;
}

interface DatabaseSettings {
  maxDatabasesPerUser: number;
  maxTablesPerDatabase: number;
  maxDocumentsPerTables: number;
}

interface PreferencesSettings {
  primaryColor: string;
  secondaryColor: string;
  thirdColor: string;
  logoUrl: string;
  fields: Record<string, string>;
}

interface SettingsDoc {
  uid?: string;
  data: {
    system?: boolean;
    general: GeneralSettings;
    database: DatabaseSettings;
    preferences: PreferencesSettings;
  };
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

interface Database {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export default function DatabaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const databaseId = params.database_id as string;
  const creatingRef = useRef(false);

  // Settings state
  const [settingsDoc, setSettingsDoc] = useState<SettingsDoc | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<{ key: string; value: string }[]>([]);

  // Database info state
  const [database, setDatabase] = useState<Database | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSoftDeleteDialogOpen, setIsSoftDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Fetch database info (from primary DB)
  useEffect(() => {
    async function fetchDatabase() {
      setDbLoading(true);
      try {
        const client = getSodularClient();
        client.use(); // primary context
        const response = await client.database.get({ filter: { uid: databaseId } });
        if (response.error) throw new Error(response.error);
        if (response.data) setDatabase(response.data);
        else toast.error("Database not found");
      } catch (e) {
        toast.error("Failed to load database info");
      } finally {
        setDbLoading(false);
      }
    }
    if (databaseId) fetchDatabase();
  }, [databaseId]);

  // Fetch or create settings doc in tenant DB
  useEffect(() => {
    async function fetchOrCreateSettings() {
      setLoading(true);
      try {
        const client = getSodularClient();
        client.use(databaseId); // switch to tenant DB
        // 1. Ensure settings table exists
        let settingsTable = await client.tables.get({ filter: { 'data.name': 'settings' } });
        let settingsTableId: string;
        if (!settingsTable.data) {
          const createTable = await client.tables.create({ data: { name: 'settings', description: 'Database settings' } });
          if (!createTable.data) throw new Error('Failed to create settings table');
          settingsTableId = createTable.data.uid;
        } else {
          settingsTableId = settingsTable.data.uid;
        }
        // 2. Ensure settings doc exists
        let settingsDocQuery = await client.ref.from(settingsTableId).query({ filter: { 'data.system': true }, take: 1 });
        const foundDoc = settingsDocQuery.data?.list?.[0];
        let doc: SettingsDoc;
        if (!foundDoc && !creatingRef.current) {
          creatingRef.current = true;
          // Create default doc
          const defaultDoc: Omit<SettingsDoc, "uid" | "createdAt" | "updatedAt" | "isActive" | "createdBy" | "updatedBy"> = {
            data: {
              system: true,
              general: {
                appName: database?.data.name || 'Database',
                appDescription: database?.data.description || '',
                timezone: 'UTC',
                dateFormat: 'MM/DD/YYYY',
                adminEmail: '',
                maintenanceMode: false,
              },
              database: {
                maxDatabasesPerUser: 10,
                maxTablesPerDatabase: 20,
                maxDocumentsPerTables: 1000,
              },
              preferences: {
                primaryColor: '#3b82f6',
                secondaryColor: '#6366f1',
                thirdColor: '#f59e42',
                logoUrl: '',
                fields: {},
              },
            },
          };
          const createDoc = await client.ref.from(settingsTableId).create({ data: defaultDoc.data });
          creatingRef.current = false;
          if (!createDoc.data) throw new Error('Failed to create settings document');
          doc = { ...defaultDoc, uid: createDoc.data.uid } as SettingsDoc;
        } else if (foundDoc) {
          const d = foundDoc;
          doc = {
            uid: d.uid,
            data: {
              system: d.data?.system ?? true,
              general: d.data?.general || {
                appName: database?.data.name || 'Database',
                appDescription: database?.data.description || '',
                timezone: 'UTC',
                dateFormat: 'MM/DD/YYYY',
                adminEmail: '',
                maintenanceMode: false,
              },
              database: d.data?.database || {
                maxDatabasesPerUser: 10,
                maxTablesPerDatabase: 20,
                maxDocumentsPerTables: 1000,
              },
              preferences: d.data?.preferences || {
                primaryColor: '#3b82f6',
                secondaryColor: '#6366f1',
                thirdColor: '#f59e42',
                logoUrl: '',
                fields: {},
              },
            },
            createdAt: (d as any).createdAt ?? Date.now(),
            updatedAt: (d as any).updatedAt ?? Date.now(),
            isActive: (d as any).isActive ?? true,
            createdBy: (d as any).createdBy ?? 'system',
            updatedBy: (d as any).updatedBy ?? 'system',
          };
        } else {
          throw new Error('Failed to find or create settings document');
        }
        setSettingsDoc(doc);
        setFields(Object.entries(doc.data.preferences.fields || {}).map(([key, value]) => ({ key, value })));
      } catch (e) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    if (databaseId) fetchOrCreateSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, database]);

  async function handleSave() {
    if (!settingsDoc) return;
    setSaving(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const updatedDoc = {
        ...settingsDoc,
        data: {
          ...settingsDoc.data,
          preferences: {
            ...settingsDoc.data.preferences,
            fields: Object.fromEntries(fields.map(f => [f.key, f.value]))
          }
        },
        updatedAt: Date.now(),
        updatedBy: 'system',
      };
      await client.tables.patch({ uid: settingsDoc.uid }, { data: updatedDoc.data });
      setSettingsDoc(updatedDoc);
      toast.success('Settings saved');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function renderGeneralTab() {
    if (!settingsDoc) return null;
    const g = settingsDoc.data.general;
    return (
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App Name</Label>
              <Input value={g.appName} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, appName: e.target.value } } }))} />
            </div>
            <div className="space-y-2">
              <Label>Admin Email</Label>
              <Input value={g.adminEmail} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, adminEmail: e.target.value } } }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>App Description</Label>
            <Textarea value={g.appDescription} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, appDescription: e.target.value } } }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={g.timezone} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, timezone: e.target.value } } }))} />
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Input value={g.dateFormat} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, dateFormat: e.target.value } } }))} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label>Maintenance Mode</Label>
            <Switch checked={g.maintenanceMode} onCheckedChange={() => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, general: { ...doc.data.general, maintenanceMode: !doc.data.general.maintenanceMode } } }))} />
            <span className="ml-2 text-xs text-muted-foreground">{g.maintenanceMode ? 'Enabled' : 'Disabled'}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>Created: {new Date(settingsDoc.createdAt).toLocaleString()}</div>
            <div>Updated: {new Date(settingsDoc.updatedAt).toLocaleString()}</div>
            <div>Created By: {settingsDoc.createdBy}</div>
            <div>Updated By: {settingsDoc.updatedBy}</div>
            <div>Status: {settingsDoc.isActive ? 'Active' : 'Inactive'}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderDatabaseTab() {
    if (!settingsDoc) return null;
    const d = settingsDoc.data.database;
    return (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Database Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Max Databases Per User</Label>
                <Input type="number" value={d.maxDatabasesPerUser} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, database: { ...doc.data.database, maxDatabasesPerUser: Number(e.target.value) } } }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Tables Per Database</Label>
                <Input type="number" value={d.maxTablesPerDatabase} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, database: { ...doc.data.database, maxTablesPerDatabase: Number(e.target.value) } } }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Documents Per Table</Label>
                <Input type="number" value={d.maxDocumentsPerTables} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, database: { ...doc.data.database, maxDocumentsPerTables: Number(e.target.value) } } }))} />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Database Info and Danger Zone */}
        {database && (
          <div className="space-y-6 mt-10">
            <Card>
              <CardHeader>
                <CardTitle>Database Information</CardTitle>
                <CardDescription>Read-only information about this database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Database ID</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{database.uid}</p>
                  </div>
                  <div>
                    <Label>Created At</Label>
                    <p className="text-sm text-muted-foreground">{new Date(database.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <p className="text-sm text-muted-foreground">{new Date(database.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <AlertTriangle className="mr-2 h-5 w-5" /> Danger Zone
                </CardTitle>
                <CardDescription>Irreversible and destructive actions for this database</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Soft Delete */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Soft Delete Database</h4>
                      <p className="text-sm text-muted-foreground">Mark this database as deleted. It can be restored later.</p>
                    </div>
                    <Dialog open={isSoftDeleteDialogOpen} onOpenChange={setIsSoftDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">Soft Delete</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Soft Delete Database</DialogTitle>
                          <DialogDescription>This will mark the database as deleted but keep the data. You can restore it later. Type the database name <strong>{database.data.name}</strong> to confirm.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="soft-delete-confirm">Database Name</Label>
                            <Input id="soft-delete-confirm" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={`Type "${database.data.name}" to confirm`} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setIsSoftDeleteDialogOpen(false); setDeleteConfirmation(""); }}>Cancel</Button>
                          <Button variant="destructive" onClick={handleSoftDelete} disabled={deleteConfirmation !== database.data.name}>Soft Delete Database</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Separator />
                  {/* Hard Delete */}
                  <div className="flex items-center justify-between p-4 border border-destructive rounded-lg bg-destructive/5">
                    <div>
                      <h4 className="font-medium text-destructive">Permanently Delete Database</h4>
                      <p className="text-sm text-muted-foreground">Permanently delete this database and all its data. This action cannot be undone.</p>
                    </div>
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Forever</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-destructive">Permanently Delete Database</DialogTitle>
                          <DialogDescription>This will permanently delete the database and all its data including tables, documents, and settings. <strong className="block mt-2 text-destructive">This action cannot be undone!</strong> Type the database name <strong>{database.data.name}</strong> to confirm.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="delete-confirm">Database Name</Label>
                            <Input id="delete-confirm" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={`Type "${database.data.name}" to confirm`} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeleteConfirmation(""); }}>Cancel</Button>
                          <Button variant="destructive" onClick={handleHardDelete} disabled={deleteConfirmation !== database.data.name}><Trash2 className="mr-2 h-4 w-4" />Delete Forever</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  function renderPreferencesTab() {
    if (!settingsDoc) return null;
    const p = settingsDoc.data.preferences;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <Sketch color={p.primaryColor} onChange={color => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, preferences: { ...doc.data.preferences, primaryColor: color.hex } } }))} />
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <Sketch color={p.secondaryColor} onChange={color => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, preferences: { ...doc.data.preferences, secondaryColor: color.hex } } }))} />
            </div>
            <div className="space-y-2">
              <Label>Third Color</Label>
              <Sketch color={p.thirdColor} onChange={color => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, preferences: { ...doc.data.preferences, thirdColor: color.hex } } }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={p.logoUrl} onChange={e => setSettingsDoc(doc => doc && ({ ...doc, data: { ...doc.data, preferences: { ...doc.data.preferences, logoUrl: e.target.value } } }))} />
            {p.logoUrl && <img src={p.logoUrl} alt="Logo" className="h-12 mt-2" />}
          </div>
          <div className="space-y-2">
            <Label>Custom Fields</Label>
            {fields.map((f, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <Input placeholder="Key" value={f.key} onChange={e => setFields(fields => fields.map((ff, idx) => idx === i ? { ...ff, key: e.target.value } : ff))} />
                <Input placeholder="Value" value={f.value} onChange={e => setFields(fields => fields.map((ff, idx) => idx === i ? { ...ff, value: e.target.value } : ff))} />
                <Button variant="destructive" onClick={() => setFields(fields => fields.filter((_, idx) => idx !== i))}>Remove</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setFields(fields => [...fields, { key: '', value: '' }])}>Add Field</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || dbLoading) {
    return <div className="space-y-6"><h1 className="text-3xl font-bold">Settings</h1><p>Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="general">{renderGeneralTab()}</TabsContent>
        <TabsContent value="database">{renderDatabaseTab()}</TabsContent>
        <TabsContent value="preferences">{renderPreferencesTab()}</TabsContent>
      </Tabs>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !settingsDoc}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
      
    </div>
  );

  // --- Danger zone logic ---
  async function handleSoftDelete() {
    if (deleteConfirmation !== database?.data.name) {
      toast.error("Database name confirmation does not match");
      return;
    }
    try {
      const client = getSodularClient();
      client.use(); // primary context
      const response = await client.database.delete({ uid: databaseId }, { withSoftDelete: true });
      if (response.error) throw new Error(response.error);
      toast.success("Database soft deleted successfully");
      setIsSoftDeleteDialogOpen(false);
      router.push("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to soft delete database");
    }
  }
  async function handleHardDelete() {
    if (deleteConfirmation !== database?.data.name) {
      toast.error("Database name confirmation does not match");
      return;
    }
    try {
      const client = getSodularClient();
      client.use(); // primary context
      const response = await client.database.delete({ uid: databaseId }, { withSoftDelete: false });
      if (response.error) throw new Error(response.error);
      toast.success("Database permanently deleted");
      setIsDeleteDialogOpen(false);
      router.push("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete database");
    }
  }
}
