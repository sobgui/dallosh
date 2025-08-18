import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Folder, ChevronLeft, ChevronRight } from "lucide-react";
import { storage, buckets } from "@/services";

export function BucketsTab() {
  // Sidebar state
  const [storages, setStorages] = useState<any[]>([]);
  const [storagesSearchQuery, setStoragesSearchQuery] = useState("");
  const [selectedStorage, setSelectedStorage] = useState<any | null>(null);
  const [sidebarPage, setSidebarPage] = useState(1);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const sidebarPageSize = 15;

  // Main area state
  const [bucketsList, setBucketsList] = useState<any[]>([]);
  const [bucketsSearchQuery, setBucketsSearchQuery] = useState("");
  const [bucketsPage, setBucketsPage] = useState(1);
  const [bucketsTotal, setBucketsTotal] = useState(0);
  const bucketsPageSize = 10;
  const [bucketsLoading, setBucketsLoading] = useState(false);
  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [addBucketForm, setAddBucketForm] = useState({ name: "", description: "" });

  // Fetch storages with search and pagination
  useEffect(() => {
    async function fetchStorages() {
      const filter = storagesSearchQuery ? { "data.name": { $regex: storagesSearchQuery, $options: "i" } } : {};
      const { data } = await storage.get().query({ filter, take: sidebarPageSize, skip: (sidebarPage - 1) * sidebarPageSize });
      setStorages(data?.list || []);
      setSidebarTotal(data?.total || 0);
      if (!selectedStorage && data?.list?.length) setSelectedStorage(data.list[0]);
    }
    fetchStorages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storagesSearchQuery, sidebarPage]);

  // Fetch buckets for selected storage
  useEffect(() => {
    async function fetchBuckets() {
      if (!selectedStorage) return;
      setBucketsLoading(true);
      const filter: any = { "data.storage_id": selectedStorage.uid };
      if (bucketsSearchQuery) filter["data.name"] = { $regex: bucketsSearchQuery, $options: "i" };
      const { data } = await buckets.get().query({ filter, take: bucketsPageSize, skip: (bucketsPage - 1) * bucketsPageSize });
      setBucketsList(data?.list || []);
      setBucketsTotal(data?.total || 0);
      setBucketsLoading(false);
    }
    fetchBuckets();
  }, [selectedStorage, bucketsSearchQuery, bucketsPage]);

  // Add Bucket
  const handleAddBucket = async () => {
    if (!selectedStorage) return;
    await buckets.get().create({ data: { ...addBucketForm, storage_id: selectedStorage.uid } });
    setIsAddBucketOpen(false);
    setAddBucketForm({ name: "", description: "" });
    setBucketsPage(1);
    // refetch
    const { data } = await buckets.get().query({ filter: { "data.storage_id": selectedStorage.uid }, take: bucketsPageSize });
    setBucketsList(data?.list || []);
    setBucketsTotal(data?.total || 0);
  };

  // Sidebar: storages list
  const renderSidebar = () => (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-sm">
          <Folder className="mr-2 h-4 w-4" />
          Storages
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search storages..."
            value={storagesSearchQuery}
            onChange={e => { setStoragesSearchQuery(e.target.value); setSidebarPage(1); }}
            className="pl-8 h-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="h-[480px] flex-1">
          {storages.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No storages found</div>
          ) : (
            <div className="space-y-1 p-2">
              {storages.map((s) => (
                <div
                  key={s.uid}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${selectedStorage?.uid === s.uid ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => { setSelectedStorage(s); setBucketsPage(1); }}
                >
                  <div className="font-medium text-sm">{s.data?.name}</div>
                  {s.data?.description && (
                    <div className="text-xs text-muted-foreground truncate">{s.data.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {/* Sidebar Pagination */}
      <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-2">
        <Button
          variant="ghost"
          size="sm"
          className="mx-1"
          onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
          disabled={sidebarPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.ceil(sidebarTotal / sidebarPageSize) }, (_, i) => i + 1)
          .slice(Math.max(0, sidebarPage - 2), sidebarPage + 1)
          .map((p) => (
            <Button
              key={p}
              variant={p === sidebarPage ? "outline" : "ghost"}
              size="sm"
              className="mx-1"
              onClick={() => setSidebarPage(p)}
              disabled={p === sidebarPage}
            >
              {p}
            </Button>
          ))}
        <Button
          variant="ghost"
          size="sm"
          className="mx-1"
          onClick={() => setSidebarPage((p) => Math.min(Math.ceil(sidebarTotal / sidebarPageSize), p + 1))}
          disabled={sidebarPage === Math.ceil(sidebarTotal / sidebarPageSize) || sidebarTotal === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );

  // Main: buckets list for selected storage or no storage
  const renderMain = () => {
    const noStorages = storages.length === 0;
    const noStorageSelected = !selectedStorage;
    const controlsDisabled = noStorages || noStorageSelected;
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Buckets</CardTitle>
              <p className="text-muted-foreground text-sm">Manage buckets for the selected storage</p>
            </div>
            <Button variant="default" onClick={() => setIsAddBucketOpen(true)} disabled={controlsDisabled}>
              <Plus className="h-4 w-4 mr-1" /> Add Bucket
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buckets..."
              value={bucketsSearchQuery}
              onChange={e => { setBucketsSearchQuery(e.target.value); setBucketsPage(1); }}
              className="pl-8 h-8"
              disabled={controlsDisabled}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlsDisabled ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                      {noStorages ? "No storages found" : "No storage selected"}
                    </TableCell>
                  </TableRow>
                ) : bucketsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : bucketsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No buckets found</p>
                        <p className="text-sm mb-4">{bucketsSearchQuery ? "No buckets match your search criteria." : "Get started by creating your first bucket."}</p>
                        {!bucketsSearchQuery && (
                          <Button onClick={() => setIsAddBucketOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create First Bucket
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  bucketsList.map((b) => (
                    <TableRow key={b.uid}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{b.data?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{b.data?.description || "No description"}</span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="mr-2">Edit</Button>
                        <Button size="sm" variant="destructive">Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {/* Pagination always visible */}
        <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-2">
          <Button
            variant="ghost"
            size="sm"
            className="mx-1"
            onClick={() => setBucketsPage((p) => Math.max(1, p - 1))}
            disabled={controlsDisabled || bucketsPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.ceil(bucketsTotal / bucketsPageSize) }, (_, i) => i + 1)
            .slice(Math.max(0, bucketsPage - 2), bucketsPage + 1)
            .map((p) => (
              <Button
                key={p}
                variant={p === bucketsPage ? "outline" : "ghost"}
                size="sm"
                className="mx-1"
                onClick={() => setBucketsPage(p)}
                disabled={controlsDisabled || p === bucketsPage}
              >
                {p}
              </Button>
            ))}
          <Button
            variant="ghost"
            size="sm"
            className="mx-1"
            onClick={() => setBucketsPage((p) => Math.min(Math.ceil(bucketsTotal / bucketsPageSize), p + 1))}
            disabled={controlsDisabled || bucketsPage === Math.ceil(bucketsTotal / bucketsPageSize) || bucketsTotal === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      <div className="lg:col-span-1">{renderSidebar()}</div>
      <div className="lg:col-span-3 flex flex-col">
        {selectedStorage ? renderMain() : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a storage to view its buckets.</div>
        )}
      </div>
      {/* Add Bucket Dialog */}
      {isAddBucketOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Add Bucket</h3>
            <form onSubmit={e => { e.preventDefault(); handleAddBucket(); }} className="space-y-2">
              <Input
                placeholder="Name"
                value={addBucketForm.name}
                onChange={e => setAddBucketForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                placeholder="Description"
                value={addBucketForm.description}
                onChange={e => setAddBucketForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="secondary" onClick={() => setIsAddBucketOpen(false)}>Cancel</Button>
                <Button type="submit" variant="default">Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 