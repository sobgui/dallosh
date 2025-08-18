"use client";

import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Database, FileText } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";

interface TableInfo {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
  updatedAt: number;
  document_count?: number;
}

interface DocumentInfo {
  uid: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}

interface CreateDocumentData {
  data: Record<string, any>;
}

export function DataTab({ setActiveTab }: { setActiveTab: Dispatch<SetStateAction<string>> }) {
  // Tables state
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tablesSearchQuery, setTablesSearchQuery] = useState("");

  // Documents state
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsSearchQuery, setDocumentsSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateDocumentData>({ data: {} });
  const [editData, setEditData] = useState<DocumentInfo | null>(null);
  const [viewData, setViewData] = useState<DocumentInfo | null>(null);
  const [jsonInput, setJsonInput] = useState("");

  // Sidebar pagination state
  const [sidebarPage, setSidebarPage] = useState(1);
  const [sidebarTotal, setSidebarTotal] = useState(0);
  const sidebarPageSize = 15;

  const pageSize = 10;

  // Fetch tables
  const fetchTables = async () => {
    try {
      setTablesLoading(true);
      const client = getSodularClient();

      const filter: any = {};
      if (tablesSearchQuery) {
        filter['data.name'] = { $regex: tablesSearchQuery, $options: 'i' };
      }

      const response = await client.tables.query({
        filter,
        take: sidebarPageSize,
        skip: (sidebarPage - 1) * sidebarPageSize,
        sort: { 'data.name': 1 }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const tablesList = response.data?.list || [];

      // Fetch document counts for each table in parallel
      const tablesWithCounts = await Promise.all(
        tablesList.map(async (table) => {
          try {
            const countRes = await client.ref.from(table.uid).count({});
            return { ...table, document_count: countRes.data?.total || 0 };
          } catch {
            return { ...table, document_count: 0 };
          }
        })
      );
      setTables(tablesWithCounts);
      setSidebarTotal(response.data?.total || 0);

      // Auto-select first table if none selected
      if (!selectedTable && tablesList.length > 0) {
        setSelectedTable(tablesList[0]);
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast.error("Failed to fetch tables");
    } finally {
      setTablesLoading(false);
    }
  };

  // Fetch documents for selected table
  const fetchDocuments = async () => {
    if (!selectedTable) return;

    try {
      setDocumentsLoading(true);
      const client = getSodularClient();

      const filter: any = {};
      if (documentsSearchQuery) {
        // Search in document data (this is a simplified search, you might want to make it more sophisticated)
        filter['$or'] = [
          { 'data': { $regex: documentsSearchQuery, $options: 'i' } }
        ];
      }

      const response = await client.ref.from(selectedTable.uid).query({
        filter,
        take: pageSize,
        skip: (currentPage - 1) * pageSize,
        sort: { createdAt: -1 }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setDocuments(response.data?.list || []);
      setTotalCount(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesSearchQuery, sidebarPage]);

  useEffect(() => {
    if (selectedTable) {
      setCurrentPage(1); // Reset to first page when table changes
      fetchDocuments();
    }
  }, [selectedTable, documentsSearchQuery, currentPage]);

  // Handle table selection
  const handleTableSelect = (table: TableInfo) => {
    setSelectedTable(table);
    setDocumentsSearchQuery(""); // Clear search when switching tables
  };

  // Handle create document
  const handleCreateDocument = async () => {
    if (!selectedTable) return;

    try {
      let documentData;
      try {
        documentData = JSON.parse(jsonInput);
      } catch (e) {
        toast.error("Invalid JSON format");
        return;
      }

      const client = getSodularClient();
      // Backend expects: { data: documentData }
      const response = await client.ref.from(selectedTable.uid).create({
        data: documentData
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Document created successfully");
      setIsCreateDialogOpen(false);
      setJsonInput("");
      fetchDocuments();
    } catch (error: any) {
      console.error("Failed to create document:", error);
      toast.error(error.message || "Failed to create document");
    }
  };

  // Handle edit document
  const handleEditDocument = async () => {
    if (!selectedTable || !editData) return;

    try {
      let documentData;
      try {
        documentData = JSON.parse(jsonInput);
      } catch (e) {
        toast.error("Invalid JSON format");
        return;
      }

      const client = getSodularClient();
      // Backend expects: filter: { uid }, data: documentData
      const response = await client.ref.from(selectedTable.uid).patch(
        { uid: editData.uid },
        { data: documentData }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Document updated successfully");
      setIsEditDialogOpen(false);
      setEditData(null);
      setJsonInput("");
      fetchDocuments();
    } catch (error: any) {
      console.error("Failed to update document:", error);
      toast.error(error.message || "Failed to update document");
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedTable) return;

    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const client = getSodularClient();
      // Use filter and options as required by backend
      const response = await client.ref.from(selectedTable.uid).delete(
        { uid: documentId },
        { withSoftDelete: true }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error: any) {
      console.error("Failed to delete document:", error);
      toast.error(error.message || "Failed to delete document");
    }
  };

  // Open dialogs
  const openCreateDialog = () => {
    setJsonInput('{\n  "name": "Example",\n  "value": "Sample data"\n}');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (document: DocumentInfo) => {
    setEditData(document);
    setJsonInput(JSON.stringify(document.data, null, 2));
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (document: DocumentInfo) => {
    setViewData(document);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Tables Sidebar */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Database className="mr-2 h-4 w-4" />
              Tables
              <Button
                variant="default"
                size="icon"
                className="ml-auto"
                onClick={() => setActiveTab('tables')}
                title="Go to Tables tab"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </Button>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={tablesSearchQuery}
                onChange={(e) => { setTablesSearchQuery(e.target.value); setSidebarPage(1); }}
                className="pl-8 h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="h-[480px] flex-1">
              {tablesLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading tables...
                </div>
              ) : tables.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No tables found
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {tables.map((table) => (
                    <div
                      key={table.uid}
                      className={`p-2 rounded-md cursor-pointer transition-colors ${
                        selectedTable?.uid === table.uid
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleTableSelect(table)}
                    >
                      <div className="font-medium text-sm">{table.data.name}</div>
                      {table.data.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {table.data.description}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {table.document_count || 0} docs
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          {/* Sticky Sidebar Pagination Bar */}
          <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              className="mx-1"
              onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
              disabled={sidebarPage === 1}
            >
              Previous
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
              Next
            </Button>
          </div>
        </Card>
      </div>

      {/* Documents Main Area */}
      <div className="lg:col-span-3">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Documents
                  {selectedTable && (
                    <Badge variant="outline" className="ml-2">
                      {selectedTable.data.name}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedTable 
                    ? `Manage documents in the ${selectedTable.data.name} table`
                    : "Select a table to view its documents"
                  }
                </CardDescription>
              </div>
              {selectedTable && (
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              )}
            </div>
            
            {selectedTable && (
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={documentsSearchQuery}
                    onChange={(e) => setDocumentsSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {!selectedTable ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a table from the sidebar to view its documents</p>
              </div>
            ) : documentsLoading ? (
              <div className="text-center py-8">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No documents found in this table</p>
                <Button onClick={openCreateDialog} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Document
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data Preview</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <TableRow key={document.uid}>
                        <TableCell className="font-mono text-xs">
                          {document.uid.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {JSON.stringify(document.data).substring(0, 100)}
                            {JSON.stringify(document.data).length > 100 && "..."}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(document.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(document.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(document)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(document)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocument(document.uid)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalCount > pageSize && (
                  <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-between py-3 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} documents
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Document Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Add a new document to the {selectedTable?.data.name} table. Enter the document data as JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="json-input">Document Data (JSON)</Label>
              <Textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{\n  "name": "Example",\n  "value": "Sample data"\n}'
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDocument}>
              Create Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update the document data. Modify the JSON below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-json-input">Document Data (JSON)</Label>
              <Textarea
                id="edit-json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDocument}>
              Update Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
            <DialogDescription>
              Document ID: {viewData?.uid}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Data</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="text-sm font-mono">
                  {viewData ? JSON.stringify(viewData.data, null, 2) : ""}
                </pre>
              </ScrollArea>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Created At</Label>
                <p className="text-muted-foreground">
                  {viewData ? new Date(viewData.createdAt).toLocaleString() : ""}
                </p>
              </div>
              <div>
                <Label>Updated At</Label>
                <p className="text-muted-foreground">
                  {viewData ? new Date(viewData.updatedAt).toLocaleString() : ""}
                </p>
              </div>
              {viewData?.createdBy && (
                <div>
                  <Label>Created By</Label>
                  <p className="text-muted-foreground">{viewData.createdBy}</p>
                </div>
              )}
              {viewData?.updatedBy && (
                <div>
                  <Label>Updated By</Label>
                  <p className="text-muted-foreground">{viewData.updatedBy}</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (viewData) openEditDialog(viewData);
            }}>
              Edit Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
