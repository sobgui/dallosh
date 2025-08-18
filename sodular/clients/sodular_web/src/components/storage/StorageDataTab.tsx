"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Database, Folder, FileText } from "lucide-react";
import { storage, buckets, files } from "@/services";
import { toast } from "sonner";

export function StorageDataTab() {
  // Sidebar: storages
  const [storages, setStorages] = useState<any[]>([]);
  const [storagesLoading, setStoragesLoading] = useState(true);
  const [selectedStorage, setSelectedStorage] = useState<any | null>(null);
  const [storagesSearchQuery, setStoragesSearchQuery] = useState("");
  const [sidebarPage, setSidebarPage] = useState(1);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const sidebarPageSize = 15;

  // Main: buckets
  const [bucketsList, setBucketsList] = useState<any[]>([]);
  const [bucketsLoading, setBucketsLoading] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<any | null>(null);
  const [bucketsSearchQuery, setBucketsSearchQuery] = useState("");
  const [bucketsPage, setBucketsPage] = useState(1);
  const [bucketsTotal, setBucketsTotal] = useState(0);
  const bucketsPageSize = 10;

  // Main: files
  const [filesList, setFilesList] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesSearchQuery, setFilesSearchQuery] = useState("");
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotal, setFilesTotal] = useState(0);
  const filesPageSize = 10;

  // Dialogs
  const [isAddStorageOpen, setIsAddStorageOpen] = useState(false);
  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [addStorageForm, setAddStorageForm] = useState({ name: "", type: "local", description: "" });
  const [addBucketForm, setAddBucketForm] = useState({ name: "", description: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFilePath, setUploadFilePath] = useState("/");
  const [uploadLoading, setUploadLoading] = useState(false);

  // Fetch storages
  const fetchStorages = async () => {
    setStoragesLoading(true);
    try {
      const filter = storagesSearchQuery ? { "data.name": { $regex: storagesSearchQuery, $options: "i" } } : {};
      const { data } = await storage.get().query({ filter, take: sidebarPageSize, skip: (sidebarPage - 1) * sidebarPageSize });
      setStorages(data?.list || []);
      setSidebarTotal(data?.total || 0);
      if (!selectedStorage && data?.list?.length) setSelectedStorage(data.list[0]);
    } catch (e) {
      toast.error("Failed to fetch storages");
    } finally {
      setStoragesLoading(false);
    }
  };

  // Fetch buckets
  const fetchBuckets = async () => {
    if (!selectedStorage) return;
    setBucketsLoading(true);
    try {
      const filter: any = { "data.storage_id": selectedStorage.uid };
      if (bucketsSearchQuery) filter["data.name"] = { $regex: bucketsSearchQuery, $options: "i" };
      const { data } = await buckets.get().query({ filter, take: bucketsPageSize, skip: (bucketsPage - 1) * bucketsPageSize });
      setBucketsList(data?.list || []);
      setBucketsTotal(data?.total || 0);
      if (!selectedBucket && data?.list?.length) setSelectedBucket(data.list[0]);
    } catch (e) {
      toast.error("Failed to fetch buckets");
    } finally {
      setBucketsLoading(false);
    }
  };

  // Fetch files
  const fetchFiles = async () => {
    if (!selectedBucket) return;
    setFilesLoading(true);
    try {
      const filter: any = { "data.bucket_id": selectedBucket.uid };
      if (filesSearchQuery) filter["data.filename"] = { $regex: filesSearchQuery, $options: "i" };
      const { data } = await files.get().query({ filter, take: filesPageSize, skip: (filesPage - 1) * filesPageSize });
      setFilesList(data?.list || []);
      setFilesTotal(data?.total || 0);
    } catch (e) {
      toast.error("Failed to fetch files");
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => { fetchStorages(); }, [storagesSearchQuery, sidebarPage]);
  useEffect(() => { if (selectedStorage) { setBucketsPage(1); fetchBuckets(); } }, [selectedStorage, bucketsSearchQuery, sidebarPage]);
  useEffect(() => { if (selectedBucket) { setFilesPage(1); fetchFiles(); } }, [selectedBucket, filesSearchQuery, bucketsPage]);

  // Add Storage
  const handleAddStorage = async () => {
    try {
      const { error } = await storage.get().create({ data: { ...addStorageForm, type: addStorageForm.type as 'local' | 'aws' | 'azure' | 'gcp' | 'ftp' } });
      if (error) throw new Error(error);
      setIsAddStorageOpen(false);
      setAddStorageForm({ name: "", type: "local", description: "" });
      fetchStorages();
      toast.success("Storage created");
    } catch (e: any) {
      toast.error(e.message || "Failed to add storage");
    }
  };

  // Add Bucket
  const handleAddBucket = async () => {
    if (!selectedStorage) return;
    try {
      const { error } = await buckets.get().create({ data: { ...addBucketForm, storage_id: selectedStorage.uid } });
      if (error) throw new Error(error);
      setIsAddBucketOpen(false);
      setAddBucketForm({ name: "", description: "" });
      fetchBuckets();
      toast.success("Bucket created");
    } catch (e: any) {
      toast.error(e.message || "Failed to add bucket");
    }
  };

  // Upload File
  const handleUploadFile = async () => {
    if (!selectedStorage || !selectedBucket || !uploadFile) return;
    setUploadLoading(true);
    try {
      const { error } = await files.get().upload({
        storage_id: selectedStorage.uid,
        bucket_id: selectedBucket.uid,
        file: uploadFile,
        filename: uploadFile.name,
        file_path: uploadFilePath || "/",
      });
      if (error) throw new Error(error);
      setIsUploadFileOpen(false);
      setUploadFile(null);
      setUploadFilePath("/");
      fetchFiles();
      toast.success("File uploaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to upload file");
    } finally {
      setUploadLoading(false);
    }
  };

  // Render
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Sidebar: Storages */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Folder className="mr-2 h-4 w-4" />
              Storages
              <Button variant="default" size="icon" className="ml-auto" onClick={() => setIsAddStorageOpen(true)} title="Add Storage">
                <Plus className="h-4 w-4 text-white" />
              </Button>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search storages..."
                value={storagesSearchQuery}
                onChange={(e) => { setStoragesSearchQuery(e.target.value); setSidebarPage(1); }}
                className="pl-8 h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="h-[480px] flex-1">
              {storagesLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading storages...</div>
              ) : storages.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No storages found</div>
              ) : (
                <div className="space-y-1 p-2">
                  {storages.map((s) => (
                    <div
                      key={s.uid}
                      className={`p-2 rounded-md cursor-pointer transition-colors ${selectedStorage?.uid === s.uid ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      onClick={() => { setSelectedStorage(s); setBucketsPage(1); setSelectedBucket(null); }}
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
            <Button variant="ghost" size="sm" className="mx-1" onClick={() => setSidebarPage((p) => Math.max(1, p - 1))} disabled={sidebarPage === 1}>Previous</Button>
            {Array.from({ length: Math.ceil(sidebarTotal / sidebarPageSize) }, (_, i) => i + 1)
              .slice(Math.max(0, sidebarPage - 2), sidebarPage + 1)
              .map((p) => (
                <Button key={p} variant={p === sidebarPage ? "outline" : "ghost"} size="sm" className="mx-1" onClick={() => setSidebarPage(p)} disabled={p === sidebarPage}>{p}</Button>
              ))}
            <Button variant="ghost" size="sm" className="mx-1" onClick={() => setSidebarPage((p) => Math.min(Math.ceil(sidebarTotal / sidebarPageSize), p + 1))} disabled={sidebarPage === Math.ceil(sidebarTotal / sidebarPageSize) || sidebarTotal === 0}>Next</Button>
          </div>
        </Card>
      </div>
      {/* Main Area: Buckets and Files */}
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Buckets & Files
              {selectedStorage && (
                <Badge variant="outline" className="ml-2">{selectedStorage.data?.name}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedStorage ? `Manage buckets and files in the ${selectedStorage.data?.name} storage` : "Select a storage to view its buckets and files"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {/* Buckets Table */}
            {bucketsLoading ? (
              <div className="text-center py-8">Loading buckets...</div>
            ) : bucketsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No buckets found in this storage</p>
                <Button onClick={() => setIsAddBucketOpen(true)} className="mt-4"><Plus className="mr-2 h-4 w-4" />Add Bucket</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search buckets..."
                      value={bucketsSearchQuery}
                      onChange={(e) => setBucketsSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button onClick={() => setIsAddBucketOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Bucket</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucketsList.map((b) => (
                      <TableRow key={b.uid} className={selectedBucket?.uid === b.uid ? "bg-muted" : ""}>
                        <TableCell className="font-medium cursor-pointer" onClick={() => { setSelectedBucket(b); setFilesPage(1); }}>
                          {b.data?.name}
                        </TableCell>
                        <TableCell>{b.data?.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedBucket(b); setFilesPage(1); }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={async () => { await buckets.get().delete({ uid: b.uid }); fetchBuckets(); toast.success("Bucket deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Buckets Pagination */}
                {bucketsTotal > bucketsPageSize && (
                  <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-between py-3 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(bucketsPage - 1) * bucketsPageSize + 1} to {Math.min(bucketsPage * bucketsPageSize, bucketsTotal)} of {bucketsTotal} buckets
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setBucketsPage(bucketsPage - 1)} disabled={bucketsPage === 1}><ChevronLeft className="h-4 w-4" />Previous</Button>
                      <span className="text-sm">Page {bucketsPage} of {Math.ceil(bucketsTotal / bucketsPageSize)}</span>
                      <Button variant="outline" size="sm" onClick={() => setBucketsPage(bucketsPage + 1)} disabled={bucketsPage >= Math.ceil(bucketsTotal / bucketsPageSize)}>Next<ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
                {/* Files Table */}
                {selectedBucket && (
                  <>
                    <div className="flex items-center space-x-2 mt-6 mb-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search files..."
                          value={filesSearchQuery}
                          onChange={(e) => setFilesSearchQuery(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <Button onClick={() => setIsUploadFileOpen(true)}><Plus className="mr-2 h-4 w-4" />Upload File</Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Path</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filesList.map((f) => (
                          <TableRow key={f.uid}>
                            <TableCell>{f.data?.filename}</TableCell>
                            <TableCell>{f.data?.size}</TableCell>
                            <TableCell>{f.data?.type}</TableCell>
                            <TableCell>{f.data?.file_path || "/"}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => window.open(f.data?.downloadUrl, '_blank')}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={async () => { await files.get().delete({ uid: f.uid }); fetchFiles(); toast.success("File deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {/* Files Pagination */}
                    {filesTotal > filesPageSize && (
                      <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-between py-3 mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {(filesPage - 1) * filesPageSize + 1} to {Math.min(filesPage * filesPageSize, filesTotal)} of {filesTotal} files
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setFilesPage(filesPage - 1)} disabled={filesPage === 1}><ChevronLeft className="h-4 w-4" />Previous</Button>
                          <span className="text-sm">Page {filesPage} of {Math.ceil(filesTotal / filesPageSize)}</span>
                          <Button variant="outline" size="sm" onClick={() => setFilesPage(filesPage + 1)} disabled={filesPage >= Math.ceil(filesTotal / filesPageSize)}>Next<ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Add Storage Dialog */}
      <Dialog open={isAddStorageOpen} onOpenChange={setIsAddStorageOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Storage</DialogTitle>
            <DialogDescription>Add a new storage provider.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={addStorageForm.name} onChange={e => setAddStorageForm(f => ({ ...f, name: e.target.value }))} required />
            <Input placeholder="Description" value={addStorageForm.description} onChange={e => setAddStorageForm(f => ({ ...f, description: e.target.value }))} />
            <select className="select select-bordered w-full" value={addStorageForm.type} onChange={e => setAddStorageForm(f => ({ ...f, type: e.target.value }))}>
              <option value="local">Local</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
              <option value="ftp">FTP</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStorageOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStorage}>Add Storage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Bucket Dialog */}
      <Dialog open={isAddBucketOpen} onOpenChange={setIsAddBucketOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Bucket</DialogTitle>
            <DialogDescription>Add a new bucket to the selected storage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={addBucketForm.name} onChange={e => setAddBucketForm(f => ({ ...f, name: e.target.value }))} required />
            <Input placeholder="Description" value={addBucketForm.description} onChange={e => setAddBucketForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBucketOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBucket}>Add Bucket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upload File Dialog */}
      <Dialog open={isUploadFileOpen} onOpenChange={setIsUploadFileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Upload a file to the selected bucket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input className="input input-bordered" type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} required />
            <Input placeholder="Virtual Path (file_path)" value={uploadFilePath} onChange={e => setUploadFilePath(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadFileOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadFile} disabled={uploadLoading}>{uploadLoading ? "Uploading..." : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 