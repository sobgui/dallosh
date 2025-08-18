import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Folder, FileText, Download } from "lucide-react";
import { storage, buckets, files, apiUrl } from "@/services";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export function FilesTab() {
  // Buckets sidebar state
  const [storages, setStorages] = useState<any[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<any | null>(null);
  const [bucketsList, setBucketsList] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<any | null>(null);
  const [bucketsSearchQuery, setBucketsSearchQuery] = useState("");
  const [bucketsPage, setBucketsPage] = useState(1);
  const [bucketsTotal, setBucketsTotal] = useState(0);
  const bucketsPageSize = 15;
  const [bucketsLoading, setBucketsLoading] = useState(false);
  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [addBucketForm, setAddBucketForm] = useState({ name: "", description: "" });

  // Files main area state
  const [filesList, setFilesList] = useState<any[]>([]);
  const [filesSearchQuery, setFilesSearchQuery] = useState("");
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotal, setFilesTotal] = useState(0);
  const filesPageSize = 10;
  const [filesLoading, setFilesLoading] = useState(false);
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFilePath, setUploadFilePath] = useState("/");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showRename, setShowRename] = useState<{ open: boolean; file: any | null }>({ open: false, file: null });
  const [showPathEdit, setShowPathEdit] = useState<{ open: boolean; file: any | null }>({ open: false, file: null });
  const [renameValue, setRenameValue] = useState("");
  const [pathValue, setPathValue] = useState("/");

  // Storage dropdown search state
  const [storagesSearchQuery, setStoragesSearchQuery] = useState("");

  // View file modal
  const [showView, setShowView] = useState<{ open: boolean; file: any | null }>({ open: false, file: null });

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch storages with search
  useEffect(() => {
    async function fetchStorages() {
      const filter = storagesSearchQuery ? { "data.name": { $regex: storagesSearchQuery, $options: "i" } } : {};
      const { data } = await storage.get().query({ filter, take: 100 });
      setStorages(data?.list || []);
      if (!selectedStorage && data?.list?.length) setSelectedStorage(data.list[0]);
    }
    fetchStorages();
  }, [storagesSearchQuery]);

  // Fetch buckets
  useEffect(() => {
    async function fetchBuckets() {
      if (!selectedStorage) return;
      setBucketsLoading(true);
      const filter: any = { "data.storage_id": selectedStorage.uid };
      if (bucketsSearchQuery) filter["data.name"] = { $regex: bucketsSearchQuery, $options: "i" };
      const { data } = await buckets.get().query({ filter, take: bucketsPageSize, skip: (bucketsPage - 1) * bucketsPageSize });
      setBucketsList(data?.list || []);
      setBucketsTotal(data?.total || 0);
      if (!selectedBucket && data?.list?.length) setSelectedBucket(data.list[0]);
      setBucketsLoading(false);
    }
    fetchBuckets();
  }, [selectedStorage, bucketsSearchQuery, bucketsPage]);

  // Fetch files
  useEffect(() => {
    async function fetchFiles() {
      if (!selectedBucket) return;
      setFilesLoading(true);
      const filter: any = { "data.bucket_id": selectedBucket.uid };
      if (filesSearchQuery) filter["data.filename"] = { $regex: filesSearchQuery, $options: "i" };
      const { data } = await files.get().query({ filter, take: filesPageSize, skip: (filesPage - 1) * filesPageSize });
      setFilesList(data?.list || []);
      setFilesTotal(data?.total || 0);
      setFilesLoading(false);
    }
    fetchFiles();
  }, [selectedBucket, filesSearchQuery, filesPage]);

  // Add Bucket
  const handleAddBucket = async () => {
    if (!selectedStorage) return;
    const { error } = await buckets.get().create({ data: { ...addBucketForm, storage_id: selectedStorage.uid } });
    if (error) toast.error(error); else toast.success("Bucket created");
    setIsAddBucketOpen(false);
    setAddBucketForm({ name: "", description: "" });
    setBucketsPage(1);
    // refetch
    const { data } = await buckets.get().query({ filter: { "data.storage_id": selectedStorage.uid }, take: bucketsPageSize });
    setBucketsList(data?.list || []);
    setBucketsTotal(data?.total || 0);
  };

  // Upload File
  const handleUploadFile = async () => {
    if (!selectedStorage || !selectedBucket || !uploadFile) return;
    setUploadLoading(true);
    const { error } = await files.get().upload({
      storage_id: selectedStorage.uid,
      bucket_id: selectedBucket.uid,
      file: uploadFile,
      filename: uploadFile.name,
      file_path: uploadFilePath || "/",
    });
    if (error) toast.error(error); else toast.success("File uploaded");
    setIsUploadFileOpen(false);
    setUploadFile(null);
    setUploadFilePath("/");
    setFilesPage(1);
    setUploadLoading(false);
    // refetch
    const filter: any = { "data.bucket_id": selectedBucket.uid };
    const { data } = await files.get().query({ filter, take: filesPageSize });
    setFilesList(data?.list || []);
    setFilesTotal(data?.total || 0);
  };

  // Rename File
  const handleRenameFile = async () => {
    if (!showRename.file) return;
    await files.get().patch({ uid: showRename.file.uid }, { data: { filename: renameValue } });
    setShowRename({ open: false, file: null });
    setFilesPage(1);
    // refetch
    const filter: any = { "data.bucket_id": selectedBucket.uid };
    const { data } = await files.get().query({ filter, take: filesPageSize });
    setFilesList(data?.list || []);
    setFilesTotal(data?.total || 0);
  };

  // Change File Path
  const handleChangePath = async () => {
    if (!showPathEdit.file) return;
    await files.get().patch({ uid: showPathEdit.file.uid }, { data: { file_path: pathValue } });
    setShowPathEdit({ open: false, file: null });
    setFilesPage(1);
    // refetch
    const filter: any = { "data.bucket_id": selectedBucket.uid };
    const { data } = await files.get().query({ filter, take: filesPageSize });
    setFilesList(data?.list || []);
    setFilesTotal(data?.total || 0);
  };

  // Render
  return (
    <div className="space-y-4">
      {/* Header: Storage dropdown with search */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          placeholder="Search storages..."
          value={storagesSearchQuery}
          onChange={e => setStoragesSearchQuery(e.target.value)}
          className="w-64"
        />
        <select
          className="select select-bordered w-64"
          value={selectedStorage?.uid || ""}
          onChange={e => { const s = storages.find(st => st.uid === e.target.value); setSelectedStorage(s); setBucketsPage(1); setSelectedBucket(null); }}
        >
          {storages && storages.length > 0 ? (
            storages.map((s) => (
              <option key={s.uid} value={s.uid}>{s.data?.name}</option>
            ))
          ) : (
            <option value="" disabled>No storages found</option>
          )}
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Sidebar: Buckets */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Folder className="mr-2 h-4 w-4" />
                Buckets
                <Button variant="default" size="icon" className="ml-auto" onClick={() => setIsAddBucketOpen(true)} title="Add Bucket">
                  <Plus className="h-4 w-4 text-white" />
                </Button>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search buckets..."
                  value={bucketsSearchQuery}
                  onChange={(e) => { setBucketsSearchQuery(e.target.value); setBucketsPage(1); }}
                  className="pl-8 h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <ScrollArea className="h-[480px] flex-1">
                {bucketsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading buckets...</div>
                ) : bucketsList.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No buckets found</div>
                ) : (
                  <div className="space-y-1 p-2">
                    {bucketsList.map((b) => (
                      <div
                        key={b.uid}
                        className={`p-2 rounded-md cursor-pointer transition-colors ${selectedBucket?.uid === b.uid ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        onClick={() => { setSelectedBucket(b); setFilesPage(1); }}
                      >
                        <div className="font-medium text-sm">{b.data?.name}</div>
                        {b.data?.description && (
                          <div className="text-xs text-muted-foreground truncate">{b.data.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            {/* Sidebar Pagination */}
            <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-2">
              <Button variant="ghost" size="sm" className="mx-1" onClick={() => setBucketsPage((p) => Math.max(1, p - 1))} disabled={bucketsPage === 1}>Previous</Button>
              {Array.from({ length: Math.ceil(bucketsTotal / bucketsPageSize) }, (_, i) => i + 1)
                .slice(Math.max(0, bucketsPage - 2), bucketsPage + 1)
                .map((p) => (
                  <Button key={p} variant={p === bucketsPage ? "outline" : "ghost"} size="sm" className="mx-1" onClick={() => setBucketsPage(p)} disabled={p === bucketsPage}>{p}</Button>
                ))}
              <Button variant="ghost" size="sm" className="mx-1" onClick={() => setBucketsPage((p) => Math.min(Math.ceil(bucketsTotal / bucketsPageSize), p + 1))} disabled={bucketsPage === Math.ceil(bucketsTotal / bucketsPageSize) || bucketsTotal === 0}>Next</Button>
            </div>
          </Card>
        </div>
        {/* Main Area: Files */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Files
                {selectedBucket && (
                  <Badge variant="outline" className="ml-2">{selectedBucket.data?.name}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {selectedBucket ? `Manage files in the ${selectedBucket.data?.name} bucket` : "Select a bucket to view its files"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {/* Files Table */}
              {filesLoading ? (
                <div className="text-center py-8">Loading files...</div>
              ) : filesList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No files found in this bucket</p>
                  <Button onClick={() => setIsUploadFileOpen(true)} className="mt-4"><Plus className="mr-2 h-4 w-4" />Upload File</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-2">
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
                              <Button variant="ghost" size="sm" onClick={() => setShowView({ open: true, file: f })}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => { setShowRename({ open: true, file: f }); setRenameValue(f.data?.filename || ""); setPathValue(f.data?.file_path || "/"); }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                try {
                                  const { error } = await files.get().delete({ uid: f.uid });
                                  if (error) {
                                    toast.error(error);
                                    return;
                                  }
                                  setFilesPage(1);
                                  const filter: any = { "data.bucket_id": selectedBucket.uid };
                                  const { data } = await files.get().query({ filter, take: filesPageSize });
                                  setFilesList(data?.list || []);
                                  setFilesTotal(data?.total || 0);
                                  toast.success("File deleted");
                                } catch (err) {
                                  toast.error("Failed to delete file.");
                                }
                              }}><Trash2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                const url = `${apiUrl}${f.data?.downloadUrl}`;
                                const token = localStorage.getItem('sodular_access_token');
                                if (!token) {
                                  toast.error('No access token found. Please login again.');
                                  return;
                                }
                                try {
                                  const response = await fetch(url, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  if (!response.ok) {
                                    toast.error('Failed to download file.');
                                    return;
                                  }
                                  const blob = await response.blob();
                                  const link = document.createElement('a');
                                  link.href = window.URL.createObjectURL(blob);
                                  link.download = f.data?.filename || 'file';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(link.href);
                                } catch (err) {
                                  toast.error('Download failed.');
                                }
                              }} title="Download"><Download className="h-4 w-4" /></Button>
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
            </CardContent>
          </Card>
        </div>
      </div>
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
            <div
              className={`border-2 border-dashed border-primary min-h-32 rounded-lg p-4 text-center cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/10' : 'border-primary'}`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
              onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                required
              />
              {uploadFile ? (
                <span className="font-medium">{uploadFile.name}</span>
              ) : (
                <span className="text-muted-foreground">Drag & drop a file here, or click to select</span>
              )}
            </div>
            <Label>Define your path</Label>
            <Input placeholder="Virtual Path (file_path)" value={uploadFilePath} onChange={e => setUploadFilePath(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadFileOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadFile} disabled={uploadLoading}>{uploadLoading ? "Uploading..." : "Upload"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit File Dialog (filename + file_path) */}
      <Dialog open={showRename.open} onOpenChange={v => setShowRename({ open: v, file: null })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} required placeholder="Filename" />
            <Input value={pathValue} onChange={e => setPathValue(e.target.value)} required placeholder="File Path" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename({ open: false, file: null })}>Cancel</Button>
            <Button onClick={async () => { if (!showRename.file) return; await files.get().patch({ uid: showRename.file.uid }, { data: { filename: renameValue, file_path: pathValue } }); setShowRename({ open: false, file: null }); setFilesPage(1); const filter: any = { "data.bucket_id": selectedBucket.uid }; const { data } = await files.get().query({ filter, take: filesPageSize }); setFilesList(data?.list || []); setFilesTotal(data?.total || 0); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View File Dialog */}
      <Dialog open={showView.open} onOpenChange={v => setShowView({ open: v, file: null })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>File Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="max-h-80 overflow-y-auto"><pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap break-all">{JSON.stringify(showView.file, null, 2)}</pre></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowView({ open: false, file: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 