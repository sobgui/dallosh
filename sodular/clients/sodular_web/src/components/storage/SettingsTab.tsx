import React, { useState } from "react";
import { storage, tables } from "@/services";
import { Switch } from "@/components/ui/switch";

export function SettingsTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [storageDoc, setStorageDoc] = useState<any>(null);
  const [switchLoading, setSwitchLoading] = useState(false);

  React.useEffect(() => {
    async function fetchStorageDoc() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await tables.get().get({ filter: { "data.name": "storage" } });
        if (error) setError(error);
        else setStorageDoc(data);
      } catch (e: any) {
        setError(e.message || "Failed to fetch storage info");
      } finally {
        setLoading(false);
      }
    }
    fetchStorageDoc();
  }, []);

  async function handleToggleActive() {
    if (!storageDoc) return;
    setSwitchLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await tables.get().patch({ uid: storageDoc.uid }, {isActive: !storageDoc.isActive });
      if (error) setError(error);
      else {
        setStorageDoc((prev: any) => ({ ...prev, isActive: !prev.isActive }));
        setSuccess(`Storage is now ${!storageDoc.isActive ? "enabled" : "disabled"}`);
      }
    } catch (e: any) {
      setError(e.message || "Failed to update storage status");
    } finally {
      setSwitchLoading(false);
    }
  }

  async function handleSoftDelete() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await storage.get().delete({}, { withSoftDelete: true });
      if (error) setError(error);
      else setSuccess("All storage marked as deleted (soft delete)");
    } catch (e: any) {
      setError(e.message || "Failed to soft delete");
    } finally {
      setLoading(false);
    }
  }

  async function handlePermanentDelete() {
    if (dangerConfirm !== "DELETE ALL") return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await storage.get().delete({}, { withSoftDelete: false });
      if (error) setError(error);
      else setSuccess("All storage, buckets, and files permanently deleted");
    } catch (e: any) {
      setError(e.message || "Failed to permanently delete");
    } finally {
      setLoading(false);
      setDangerConfirm("");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold mb-2">Storage Management Settings</h2>
        <p className="text-muted-foreground mb-4">Manage global storage settings and perform dangerous operations.</p>
      </div>
      {/* Storage Table Info */}
      <div className="bg-card p-4 rounded-lg shadow flex flex-col gap-2">
        <h3 className="font-semibold">Storage Table Info</h3>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : storageDoc ? (
          <>
            <div className="flex items-center gap-4 mb-2">
              <span className="font-medium">Enabled:</span>
              <Switch checked={!!storageDoc.isActive} onCheckedChange={handleToggleActive} disabled={switchLoading} />
              <span className="ml-2 text-xs text-muted-foreground">{storageDoc.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="text-sm text-muted-foreground">Name: <span className="font-mono">{storageDoc.data?.name}</span></div>
            <div className="text-sm text-muted-foreground">Description: <span className="font-mono">{storageDoc.data?.description}</span></div>
            <div className="text-xs text-muted-foreground">UID: <span className="font-mono">{storageDoc.uid}</span></div>
            <div className="text-xs text-muted-foreground">Created: <span className="font-mono">{new Date(storageDoc.createdAt).toLocaleString()}</span></div>
            <div className="text-xs text-muted-foreground">Updated: <span className="font-mono">{new Date(storageDoc.updatedAt).toLocaleString()}</span></div>
          </>
        ) : (
          <div>No storage table found.</div>
        )}
      </div>
      {/* Soft delete */}
      <div className="bg-card p-4 rounded-lg shadow flex flex-col gap-2">
        <h3 className="font-semibold">Soft Delete All Storage</h3>
        <p className="text-muted-foreground">This will mark all storage as deleted (soft delete). Buckets and files will not be physically removed.</p>
        <button className="btn btn-warning w-fit" onClick={handleSoftDelete} disabled={loading}>
          {loading ? "Processing..." : "Soft Delete All Storage"}
        </button>
      </div>
      {/* Dangerous zone */}
      <div className="bg-destructive/10 border border-destructive p-4 rounded-lg flex flex-col gap-2">
        <h3 className="font-semibold text-destructive">Dangerous Zone</h3>
        <p className="text-destructive">This will permanently delete ALL storage, buckets, and files. This action cannot be undone.</p>
        <input
          className="input input-bordered w-full"
          placeholder="Type DELETE ALL to confirm"
          value={dangerConfirm}
          onChange={e => setDangerConfirm(e.target.value)}
        />
        <button
          className="btn btn-error w-fit"
          onClick={handlePermanentDelete}
          disabled={loading || dangerConfirm !== "DELETE ALL"}
        >
          {loading ? "Processing..." : "Permanently Delete All Storage"}
        </button>
      </div>
      
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {success && <div className="text-green-600 mt-2">{success}</div>}
    </div>
  );
} 