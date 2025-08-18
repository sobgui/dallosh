'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield,
  Headphones,
  User,
  Plus,
  X
} from "lucide-react";
import { getSodularClient } from "@/services/client";
import { useAuthStore } from "@/stores/auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserData {
  uid: string;
  data: {
    email: string;
    username?: string;
    imageUrl?: string;
    fields?: {
      displayName?: string;
      role?: string;
      bio?: string;
    };
    createdAt: number;
    isActive: boolean;
  };
}

export default function UserManagementPage() {
  const { isAdmin } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
    role: "user",
    bio: "",
  });

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.auth.query({ take: 100 });
      if (result.data?.list) {
        setUsers(result.data.list);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      const userData = {
        data: {
          email: formData.email,
          password: formData.password,
          username: formData.username,
          fields: {
            displayName: formData.displayName,
            role: formData.role,
            bio: formData.bio,
          },
        },
      };

      const result = await client.auth.create(userData);
      
      if (result.data) {
        console.log("User created successfully:", result.data);
        setShowCreateDialog(false);
        resetForm();
        fetchUsers(); // Refresh the list
      } else {
        console.error("Failed to create user:", result.error);
        alert("Failed to create user: " + result.error);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error creating user. Please try again.");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    try {
      const client = await getSodularClient();
      if (!client) return;

      const updateData = {
        data: {
          username: formData.username,
          fields: {
            displayName: formData.displayName,
            role: formData.role,
            bio: formData.bio,
          },
        },
      };

      const result = await client.auth.patch({ uid: editingUser.uid }, updateData);
      
      if (result.data) {
        console.log("User updated successfully:", result.data);
        setShowEditDialog(false);
        setEditingUser(null);
        resetForm();
        fetchUsers(); // Refresh the list
      } else {
        console.error("Failed to update user:", result.error);
        alert("Failed to update user: " + result.error);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error updating user. Please try again.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const client = await getSodularClient();
      if (!client) return;

      const result = await client.auth.delete({ uid: userId });
      
      if (!result.error) {
        console.log("User deleted successfully");
        fetchUsers(); // Refresh the list
      } else {
        console.error("Failed to delete user:", result.error);
        alert("Failed to delete user: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      username: "",
      password: "",
      displayName: "",
      role: "user",
      bio: "",
    });
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.data.email,
      username: user.data.username || "",
      password: "", // Don't show password in edit
      displayName: user.data.fields?.displayName || "",
      role: user.data.fields?.role || "user",
      bio: user.data.fields?.bio || "",
    });
    setShowEditDialog(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'agent':
        return <Headphones className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Admin</Badge>;
      case 'agent':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Agent</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">User</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.data.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.data.username && user.data.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.data.fields?.displayName && user.data.fields.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === "all" || user.data.fields?.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Access Denied</div>
        <div className="text-gray-400">You don't have permission to access this page.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400">Create and manage user accounts and roles</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="agent">Agents</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.uid} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.data.imageUrl} alt={user.data.username || user.data.email} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {(user.data.username || user.data.email[0]).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {user.data.fields?.displayName || user.data.username || 'No Name'}
                      </span>
                      {getRoleBadge(user.data.fields?.role || 'user')}
                    </div>
                    <div className="text-sm text-gray-400">
                      @{user.data.username || 'no-username'} • {user.data.email}
                    </div>
                    {user.data.fields?.bio && (
                      <div className="text-sm text-gray-500 mt-1">{user.data.fields.bio}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(user.data.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(user)}
                        className="text-white hover:bg-gray-700 cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteUser(user.uid)}
                        className="text-red-400 hover:bg-gray-700 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-700 border-gray-600 text-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Input
                id="edit-bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
