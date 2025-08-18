"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, HardDrive } from "lucide-react";
import { getSodularClient, isClientReady } from "@/services";
import { toast } from "sonner";
import { FormGenerator } from '../generators/form/FormGenerator';

interface User {
  uid: string;
  data: {
    email: string;
    username?: string;
    isActive?: boolean;
    isEmailVerified?: boolean;
  };
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export function UsersManagement({ databaseId }: { databaseId?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [usersTableId, setUsersTableId] = useState<string | null>(null);
  const [checkingTable, setCheckingTable] = useState(true);
  const [clientReady, setClientReady] = useState(false);
  const pageSize = 10;

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

  // Check if users table exists
  useEffect(() => {
    if (!clientReady) return;
    async function checkUsersTable() {
      setCheckingTable(true);
      try {
        const client = getSodularClient();
        if (databaseId && databaseId !== 'primary') {
          client.use(databaseId);
        } else {
          client.use();
        }
        const { data } = await client.tables.get({ filter: { 'data.name': 'users' } });
        if (data) {
          setUsersTableId(data.uid);
        } else {
          setUsersTableId(null);
        }
      } catch {
        setUsersTableId(null);
      } finally {
        setCheckingTable(false);
      }
    }
    checkUsersTable();
  }, [databaseId, clientReady]);

  // Enable users table
  const handleEnableUsers = async () => {
    if (!clientReady) return;
    setCheckingTable(true);
    try {
      const client = getSodularClient();
      if (databaseId && databaseId !== 'primary') {
        client.use(databaseId);
      } else {
        client.use();
      }
      const { data } = await client.tables.create({ 
        data: { 
          name: 'users', 
          description: 'Users collection for authentication and user management',
          enableLogin:true,
          enableRegister:true
        } 
      });
      if (data) {
        setUsersTableId(data.uid);
        toast.success('Users table created successfully!');
      } else {
        toast.error('Failed to create users table');
      }
    } catch (e) {
      toast.error('Failed to create users table');
    } finally {
      setCheckingTable(false);
    }
  };

  // Fetch users (only if table exists)
  const fetchUsers = async () => {
    if (!usersTableId || !clientReady) return;
    try {
      setLoading(true);
      const client = getSodularClient();
      if (databaseId && databaseId !== 'primary') {
        client.use(databaseId);
      } else {
        client.use();
      }
      const filter: any = {};
      if (searchQuery) {
        filter['$or'] = [
          { 'data.email': { $regex: searchQuery, $options: 'i' } },
          { 'data.username': { $regex: searchQuery, $options: 'i' } }
        ];
      }
      const response = await client.ref.from(usersTableId).query({
        filter,
        take: pageSize,
        skip: (currentPage - 1) * pageSize,
        sort: { 'data.email': 1 }
      });
      if (response.error) {
        throw new Error(response.error);
      }
      setUsers(response.data?.list || []);
      setTotalCount(response.data?.total || 0);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usersTableId && clientReady) fetchUsers();
  }, [usersTableId, searchQuery, currentPage, clientReady]);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!clientReady) return;
    if (!confirm(`Are you sure you want to delete user "${userEmail}"?`)) {
      return;
    }

    try {
      const client = getSodularClient();
      const response = await client.auth.delete({ uid: userId });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    fetchUsers();
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!clientReady || checkingTable) {
    return <div className="text-center py-8">Checking users table...</div>;
  }

  if (!usersTableId) {
    return (
      <Card className="max-w-xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Enable User Authentication</CardTitle>
          <CardDescription>
            To manage users and authentication for this database, you need to enable the users table.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleEnableUsers} disabled={checkingTable}>
            <HardDrive className="mr-2 h-4 w-4" />
            {checkingTable ? 'Enabling...' : 'Enable Users'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          <Badge variant="secondary">
            {totalCount} users
          </Badge>
        </div>
        
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage users in this database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No users found. Create your first user to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.data.email}</TableCell>
                      <TableCell>{user.data.username || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.data.isActive !== false ? "default" : "secondary"}>
                          {user.data.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.uid, user.data.email)}
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
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
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
                      disabled={currentPage === totalPages}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user by filling out the form below.
            </DialogDescription>
          </DialogHeader>
          <FormGenerator 
            collectionName="users"
            method="post"
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <FormGenerator 
              collectionName="users"
              method="patch"
              documentId={editingUser.uid}
              onSuccess={handleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
