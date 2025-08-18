"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, Eye, ExternalLink, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";

interface Database {
  uid: string;
  data: {
    name: string;
    description?: string;
    parent_id?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface CreateDatabaseData {
  name: string;
  description: string;
}

interface DatabasesManagementProps {
  parentDatabaseId?: string;
}

export function DatabasesManagement({ parentDatabaseId }: DatabasesManagementProps) {
  const router = useRouter();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateDatabaseData>({
    name: "",
    description: ""
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDatabase, setDeletingDatabase] = useState<Database | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const pageSize = 10;

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const client = getSodularClient();

      const filter: any = {};
      if (searchQuery) {
        filter['data.name'] = { $regex: searchQuery, $options: 'i' };
      }
      if (parentDatabaseId) {
        filter['data.parent_id'] = parentDatabaseId;
      }

      const response = await client.database.query({
        filter,
        take: pageSize,
        skip: (currentPage - 1) * pageSize,
        sort: { 'data.name': 1 }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setDatabases(response.data?.list || []);
      setTotalCount(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch databases:", error);
      toast.error("Failed to fetch databases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, [searchQuery, parentDatabaseId, currentPage]);

  const handleCreateDatabase = async () => {
    try {
      const client = getSodularClient();
      const response = await client.database.create({
        data: {
          name: createData.name,
          description: createData.description
        },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Database created successfully");
      setIsCreateDialogOpen(false);
      setCreateData({ name: "", description: "" });
      fetchDatabases();
    } catch (error: any) {
      console.error("Failed to create database:", error);
      toast.error(error.message || "Failed to create database");
    }
  };

  const openDeleteDialog = (database: Database) => {
    setDeletingDatabase(database);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeletingDatabase(null);
    setDeleteDialogOpen(false);
    setDeleteLoading(false);
  };

  const handleDeleteDatabase = async (databaseId: string, soft: boolean) => {
    setDeleteLoading(true);
    try {
      const client = getSodularClient();
      const response = await client.database.delete(
        { uid: databaseId },
        soft ? { withSoftDelete: true } : {}
      );
      if (response.error) {
        throw new Error(response.error);
      }
      toast.success(soft ? "Database soft deleted successfully" : "Database permanently deleted");
      closeDeleteDialog();
      fetchDatabases();
    } catch (error: any) {
      console.error("Failed to delete database:", error);
      toast.error(error.message || "Failed to delete database");
      setDeleteLoading(false);
    }
  };

  const handleViewDatabase = (databaseId: string) => {
    router.push(`/database/${databaseId}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search databases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          <Badge variant="secondary">
            {totalCount} databases
          </Badge>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Database
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Database</DialogTitle>
              <DialogDescription>
                {parentDatabaseId 
                  ? "Create a new child database nested under the current database."
                  : "Create a new database in the system."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateDatabase}>
                Create Database
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {parentDatabaseId ? "Child Databases" : "Databases"}
          </CardTitle>
          <CardDescription>
            {parentDatabaseId 
              ? "Manage child databases nested under the current database"
              : "Manage all databases in the system"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading databases...</div>
          ) : databases.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {parentDatabaseId 
                ? "No child databases found. Create your first child database to get started."
                : "No databases found. Create your first database to get started."
              }
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((database) => (
                    <TableRow key={database.uid}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{database.data.name}</span>
                          {database.data.parent_id && (
                            <Badge variant="secondary" className="text-xs">
                              Child
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{database.data.description || "-"}</TableCell>
                      <TableCell>
                        {new Date(database.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDatabase(database.uid)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDatabase(database.uid)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(database)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} databases
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
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Database Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Delete Database
            </DialogTitle>
            <DialogDescription>
              {deletingDatabase && (
                <>
                  Are you sure you want to delete the database <strong>{deletingDatabase.data.name}</strong>?<br />
                  <span className="text-destructive">This action cannot be undone.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Button
              variant="outline"
              disabled={deleteLoading}
              onClick={() => deletingDatabase && handleDeleteDatabase(deletingDatabase.uid, true)}
            >
              {deleteLoading ? "Deleting..." : "Soft Delete (Can be restored)"}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => deletingDatabase && handleDeleteDatabase(deletingDatabase.uid, false)}
            >
              {deleteLoading ? "Deleting..." : "Delete Permanently (Dangerous)"}
            </Button>
            <Button variant="ghost" onClick={closeDeleteDialog} disabled={deleteLoading}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
