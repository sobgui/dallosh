"use client";

import { useEffect, useState } from "react";
import { StorageDataTab } from "@/components/storage/StorageDataTab";
import { tables } from "@/services";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilesTab } from "@/components/storage/FilesTab";
import { BucketsTab } from "@/components/storage/BucketsTab";
import { StorageTab } from "@/components/storage/StorageTab";
import { SettingsTab } from "@/components/storage/SettingsTab";
import { Button } from "@/components/ui/button";

export default function StoragePage() {
  const validTabs = ["files", "buckets", "storage", "settings"];
  const [activeTab, setActiveTab] = useState("files");
  const [storageEnabled, setStorageEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStorageCollection() {
      setLoading(true);
      try {
        const { data } = await tables.get().get({ filter: { "data.name": "storage" } });
        setStorageEnabled(!!data);
      } catch {
        setStorageEnabled(false);
      } finally {
        setLoading(false);
      }
    }
    checkStorageCollection();
  }, []);

  const handleEnableStorage = async () => {
    setLoading(true);
    try {
      await tables.get().create({ data: { name: "storage", description: "Storage collection" } });
      await tables.get().create({ data: { name: "buckets", description: "Buckets collection" } });
      await tables.get().create({ data: { name: "files", description: "Files collection" } });
      setStorageEnabled(true);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!storageEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-card p-8 rounded-lg shadow-md flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Enable Storage Management</h2>
          <p className="mb-4 text-muted-foreground">To use storage features, enable storage management. This will create the required collections: <b>storage</b>, <b>buckets</b>, and <b>files</b>.</p>
          <Button variant="default" onClick={handleEnableStorage} disabled={loading}>
            {loading ? "Enabling..." : "Enable Storage"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Storage Management</h1>
        <p className="text-muted-foreground">
          Manage storage, buckets, and files for the current database
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="buckets">Buckets</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="space-y-4">
          <FilesTab />
        </TabsContent>
        <TabsContent value="buckets" className="space-y-4">
          <BucketsTab />
        </TabsContent>
        <TabsContent value="storage" className="space-y-4">
          <StorageTab />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
} 