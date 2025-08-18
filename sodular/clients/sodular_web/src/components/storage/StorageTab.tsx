import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader as DialogH, DialogTitle as DialogT } from "@/components/ui/dialog";
import { Plus, Search, HardDrive } from "lucide-react";
import { storage } from "@/services";

export function StorageTab() {
  const [storages, setStorages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "local", description: "", configs: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addConfigError, setAddConfigError] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    fetchStorages();
    // eslint-disable-next-line
  }, [search, page]);

  async function fetchStorages() {
    setLoading(true);
    setError(null);
    try {
      const filter = search ? { "data.name": { $regex: search, $options: "i" } } : {};
      const { data, error } = await storage.get().query({ filter, take: pageSize, skip: (page - 1) * pageSize });
      if (error) setError(error);
      const list = (data && Array.isArray(data.list)) ? data.list : [];
      setStorages(list);
      setTotal(data?.total || 0);
    } catch (e: any) {
      setError(e.message || "Failed to load storages");
      setStorages([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStorage(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    setAddConfigError(null);
    try {
      let configsObj = undefined;
      if (addForm.type !== "local") {
        if (!addForm.configs) {
          setAddConfigError("Configs are required for this storage type.");
          setAddLoading(false);
          return;
        }
        try {
          configsObj = JSON.parse(addForm.configs);
        } catch (err) {
          setAddConfigError("Invalid JSON format for configs.");
          setAddLoading(false);
          return;
        }
      }
      const payload: any = { ...addForm, configs: configsObj };
      if (addForm.type === "local") delete payload.configs;
      const { error } = await storage.get().create({ data: payload });
      if (error) setAddError(error);
      else {
        setShowAdd(false);
        setAddForm({ name: "", type: "local", description: "", configs: "" });
        fetchStorages();
      }
    } catch (e: any) {
      setAddError(e.message || "Failed to add storage");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Storages</h2>
          <p className="text-muted-foreground">Manage storage backends for the current database</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Storage
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search storages..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {storages.length} storage{storages.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Storages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="mr-2 h-5 w-5" />
            Storages
          </CardTitle>
          <CardDescription>All storage backends for this database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-center py-12">{error}</div>
          ) : storages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HardDrive className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No storages found</p>
              <p className="text-sm mb-4">
                {search ? "No storages match your search criteria." : "Get started by creating your first storage."}
              </p>
              {!search && (
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Storage
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storages.map((s) => (
                  <TableRow key={s.uid}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{s.data?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.data?.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{s.data?.description || "No description"}</span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="mr-2">Edit</Button>
                      <Button size="sm" variant="destructive">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* Pagination */}
        <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-3">
          <Button
            variant="ghost"
            size="sm"
            className="mx-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1)
            .slice(Math.max(0, page - 2), page + 1)
            .map((p) => (
              <Button
                key={p}
                variant={p === page ? "outline" : "ghost"}
                size="sm"
                className="mx-1"
                onClick={() => setPage(p)}
                disabled={p === page}
              >
                {p}
              </Button>
            ))}
          <Button
            variant="ghost"
            size="sm"
            className="mx-1"
            onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
            disabled={page * pageSize >= total}
          >
            Next
          </Button>
        </div>
      </Card>

      {/* Add Storage Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogH>
            <DialogT>Add New Storage</DialogT>
          </DialogH>
          <form className="space-y-4" onSubmit={handleAddStorage}>
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <select
                className="input"
                value={addForm.type}
                onChange={e => setAddForm(f => ({ ...f, type: e.target.value, configs: "" }))}
              >
                <option value="local">Local</option>
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">GCP</option>
                <option value="ftp">FTP</option>
              </select>
            </div>
            <Input
              placeholder="Description"
              value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
            />
            {addForm.type !== "local" && (
              <div>
                <textarea
                  className="input w-full min-h-[80px] font-mono"
                  placeholder="JSON configs (required for non-local types)"
                  value={addForm.configs}
                  onChange={e => setAddForm(f => ({ ...f, configs: e.target.value }))}
                  required
                />
                {addConfigError && <div className="text-red-500 mt-1">{addConfigError}</div>}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} disabled={addLoading}>Cancel</Button>
              <Button type="submit" variant="default" disabled={addLoading}>{addLoading ? "Adding..." : "Add"}</Button>
            </div>
            {addError && <div className="text-red-500 mt-1">{addError}</div>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 