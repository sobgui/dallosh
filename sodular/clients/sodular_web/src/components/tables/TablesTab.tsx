"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Database, Plus, Search, MoreHorizontal, Edit, Trash2, Eye, FileText } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";

interface Table {
  uid: string;
  data: {
    name: string;
    description?: string;
    isActive?: boolean;
  };
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  document_count?: number;
}

interface CreateTableData {
  name: string;
  description: string;
}

interface EditTableData {
  name: string;
  description: string;
}

const DEFAULT_COLLECTIONS = [
  'users', 'relationships', 'schema', 'permissions', 'rules',
  'roles', 'users_roles', 'users_permissions', 'roles_permissions'
];

export function TablesTab() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [createData, setCreateData] = useState<CreateTableData>({ name: "", description: "" });
  const [editData, setEditData] = useState<EditTableData>({ name: "", description: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;

  const fetchTables = async () => {
    try {
      setLoading(true);
      const client = getSodularClient();

      const filter: any = {};
      if (searchQuery) {
        filter['data.name'] = { $regex: searchQuery, $options: 'i' };
      }

      const response = await client.tables.query({
        filter,
        take: pageSize,
        skip: (page - 1) * pageSize,
        sort: { 'data.name': 1 }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setTables(response.data?.list || []);
      setTotal(response.data?.total || 0);
      // Fetch document counts for each table in parallel
      const tablesList = response.data?.list || [];
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
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast.error("Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, page]);

  const handleCreateTable = async () => {
    try {
      const client = getSodularClient();
      const response = await client.tables.create({
        data: {
          name: createData.name,
          description: createData.description
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Table created successfully");
      setIsCreateDialogOpen(false);
      setCreateData({ name: "", description: "" });
      fetchTables();
    } catch (error: any) {
      console.error("Failed to create table:", error);
      toast.error(error.message || "Failed to create table");
    }
  };

  const handleEditTable = async () => {
    if (!editingTable) return;

    try {
      const client = getSodularClient();
      const response = await client.tables.patch(
        { uid: editingTable.uid },
        {
          data: {
            name: editData.name,
            description: editData.description
          }
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Table updated successfully");
      setIsEditDialogOpen(false);
      setEditingTable(null);
      setEditData({ name: "", description: "" });
      fetchTables();
    } catch (error: any) {
      console.error("Failed to update table:", error);
      toast.error(error.message || "Failed to update table");
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete the table "${table.data.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const client = getSodularClient();
      const response = await client.tables.delete(
        { uid: table.uid },
        { withSoftDelete: true }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Table deleted successfully");
      fetchTables();
    } catch (error: any) {
      console.error("Failed to delete table:", error);
      toast.error(error.message || "Failed to delete table");
    }
  };

  const openEditDialog = (table: Table) => {
    setEditingTable(table);
    setEditData({
      name: table.data.name,
      description: table.data.description || ""
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tables</h2>
          <p className="text-muted-foreground">
            Manage tables and collections in this database
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Table
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {tables.length} table{tables.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Tables
          </CardTitle>
          <CardDescription>
            All tables and collections in this database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tables found</p>
              <p className="text-sm mb-4">
                {searchQuery ? "No tables match your search criteria." : "Get started by creating your first table."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Table
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => {
                  const isReadOnly = DEFAULT_COLLECTIONS.includes(table.data.name);
                  return (
                    <TableRow key={table.uid}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{table.data.name}</span>
                          {isReadOnly && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              Read Only
                            </Badge>
                          )}
                          {table.data.name === 'users' && (
                            <Badge variant="secondary" className="text-xs">
                              Users
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {table.data.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {table.document_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(table.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={table.data.isActive !== false ? "default" : "secondary"}>
                          {table.data.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!isReadOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(table)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTable(table)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* Sticky Pagination Bar */}
        <div className="sticky bottom-0 bg-card border-t z-10 flex items-center justify-center py-3">
          {/* Working Pagination UI */}
          <Button
            variant="ghost"
            size="sm"
            className="mx-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map((p) => (
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
            disabled={page === Math.ceil(total / pageSize) || total === 0}
          >
            Next
          </Button>
        </div>
      </Card>

      {/* Create Table Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Create a new table/collection in this database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Table Name</Label>
              <Input
                id="create-name"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                placeholder="Enter table name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                placeholder="Enter table description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTable}
              disabled={!createData.name.trim()}
            >
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>
              Update table information and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Table Name</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Enter table name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Enter table description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditTable}
              disabled={!editData.name.trim()}
            >
              Update Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
