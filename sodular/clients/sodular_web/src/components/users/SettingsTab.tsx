"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getSodularClient, isClientReady } from "@/services";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableData } from "@/lib/sodular/types/schema";

// More specific interface for our settings data
interface AuthSettingsData extends TableData {
  allow: {
    create: boolean;
  };
  isActive: boolean;
}

// Interface for the full collection object
interface AuthCollection extends Table {
  data: AuthSettingsData;
  isActive?: boolean;
}

interface SettingsTabProps {
  databaseId?: string;
}

export function SettingsTab({ databaseId }: SettingsTabProps) {
  const [collection, setCollection] = useState<AuthCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [usersTableExists, setUsersTableExists] = useState<boolean | null>(null);

  const client = useMemo(() => {
    if (clientReady) {
      const c = getSodularClient();
      if (databaseId) {
        c.use(databaseId);
      } else {
        c.use(); // home context
      }
      return c;
    }
    return null;
  }, [clientReady, databaseId]);

  const fetchCollection = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const response = await client.tables.get({ filter: { 'data.name': 'users' } });
      if (response.error || !response.data) {
        setCollection(null);
      } else {
        setCollection(response.data as unknown as AuthCollection);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch auth settings");
      setCollection(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!isClientReady()) {
      setClientReady(false);
      const interval = setInterval(() => {
        if (isClientReady()) {
          setClientReady(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      setClientReady(true);
    }
  }, []);

  useEffect(() => {
    if (clientReady) {
      fetchCollection();
    }
  }, [clientReady, fetchCollection]);

  // Check if users table exists (for database context)
  useEffect(() => {
    if (!clientReady || !databaseId) return;
    async function checkUsersTable() {
      try {
        const c = getSodularClient();
        c.use(databaseId);
        const { data } = await c.tables.get({ filter: { 'data.name': 'users' } });
        setUsersTableExists(!!data);
      } catch {
        setUsersTableExists(false);
      }
    }
    checkUsersTable();
  }, [clientReady, databaseId]);

  // Enable users table (for database context)
  const handleEnableUsers = async () => {
    if (!clientReady || !databaseId) return;
    try {
      const c = getSodularClient();
      c.use(databaseId);
      const { data } = await c.tables.create({
        data: {
          name: 'users',
          description: 'Users collection for authentication and user management',
          enableLogin: true,
          enableRegister: true
        }
      });
      if (data) {
        setUsersTableExists(true);
        toast.success('Users table created successfully!');
        fetchCollection();
      } else {
        toast.error('Failed to create users table');
      }
    } catch (e) {
      toast.error('Failed to create users table');
    }
  };

  const handleUpdate = (path: string, value: any) => {
    setCollection(prev => {
      if (!prev) return null;
  
      // Deep copy to avoid direct state mutation
      const newCollection = JSON.parse(JSON.stringify(prev));
  
      // eslint-disable-next-line @typescript-eslint/no-shadow
      let current: any = newCollection;
      const keys = path.split('.');
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
        if (current === undefined) {
          // Path does not exist, do not update
          return prev;
        }
      }
  
      current[keys[keys.length - 1]] = value;
      return newCollection;
    });
  };
  
  const handleSave = async (path: string, value: any) => {
    if (!collection || !client) return;
    setIsSaving(true);
    try {
      let patchObj: any = {};
      if (path === 'isActive') {
        patchObj.isActive = value;
      } else if (path === 'data.enableLogin') {
        patchObj.data = { enableLogin: value };
      } else if (path === 'data.enableRegister') {
        patchObj.data = { enableRegister: value };
      }
      const response = await client.tables.patch(
        { uid: collection.uid },
        patchObj
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success("Settings saved successfully");
      fetchCollection();
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!collection || !client) return;
    try {
      const response = await client.tables.patch(
        { uid: collection.uid },
        { isLocked: !collection.isLocked }
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success(`Collection ${!collection.isLocked ? 'locked' : 'unlocked'} successfully`);
      fetchCollection();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${!collection.isLocked ? 'lock' : 'unlock'} collection`);
    }
  };

  const handleDelete = async () => {
    if (!collection || !client) return;
    try {
      const response = await client.tables.delete({ uid: collection.uid }, { withSoftDelete: true });
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success("Collection has been soft-deleted.");
      // Optionally, you might want to redirect or disable the UI here
    } catch (error: any) {
      toast.error(error.message || "Failed to delete collection.");
    }
  };

  if (!clientReady) {
    return <div className="text-destructive">Sodular client is not ready. Please check your backend connection.</div>;
  }
  if (loading) {
    return <div>Loading settings...</div>;
  }

  // For database context: if users table does not exist, show enable card
  if (databaseId && usersTableExists === false) {
    return (
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Enable User Authentication</CardTitle>
          <CardDescription>
            To manage users and authentication for this database, you need to enable the users table.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleEnableUsers}>
            Enable Users
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!collection) {
    return <div className="text-destructive">Users collection not found. Please contact your administrator.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Settings</CardTitle>
          <CardDescription>Manage authentication and registration for users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="isActive" className="font-medium">Enable Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Globally enable or disable login and registration for all users.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={collection.isActive ?? false}
              onCheckedChange={(value) => {
                handleUpdate('isActive', value);
                handleSave('isActive', value);
              }}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="enableLogin" className="font-medium">Enable Login</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to log in to the system.
              </p>
            </div>
            <Switch
              id="enableLogin"
              checked={collection.data?.enableLogin ?? true}
              onCheckedChange={(value) => {
                handleUpdate('data.enableLogin', value);
                handleSave('data.enableLogin', value);
              }}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="enableRegister" className="font-medium">Enable Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register for an account.
              </p>
            </div>
            <Switch
              id="enableRegister"
              checked={collection.data?.enableRegister ?? true}
              onCheckedChange={(value) => {
                handleUpdate('data.enableRegister', value);
                handleSave('data.enableRegister', value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Soft Delete Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Soft Delete Collection</CardTitle>
          <CardDescription>Temporarily remove the users collection. You can restore it later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="destructive" onClick={handleDelete}>
            Soft Delete Users Collection
          </Button>
        </CardContent>
      </Card>

      {/* Permanent Delete Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone: Permanent Delete</CardTitle>
          <CardDescription>This action is irreversible. The users collection and all its data will be permanently deleted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="destructive" onClick={async () => {
            if (!collection || !client) return;
            try {
              const response = await client.tables.delete({ uid: collection.uid });
              if (response.error) throw new Error(response.error);
              toast.success("Users collection permanently deleted.");
              fetchCollection();
            } catch (error: any) {
              toast.error(error.message || "Failed to permanently delete collection.");
            }
          }}>
            Permanently Delete Users Collection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 