"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Database, Edit, Trash2, Plus } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthorizationsStore } from '@/stores/authorizationsStore';
import { AsyncSearchSelect } from '@/components/ui/AsyncSearchSelect';

interface Collection {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
  createdAt: number;
  isActive?: boolean;
}

interface DatabaseInfo {
  uid: string;
  data: {
    name: string;
    description?: string;
  };
}

export default function DatabaseAuthorizationsPage() {
  const params = useParams();
  const databaseId = params.database_id as string;
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [usersRolesCollection, setUsersRolesCollection] = useState<Collection | null>(null);
  const [usersPermissionsCollection, setUsersPermissionsCollection] = useState<Collection | null>(null);
  const [rolesPermissionsCollection, setRolesPermissionsCollection] = useState<Collection | null>(null);
  const [isCreateUsersRolesDialogOpen, setIsCreateUsersRolesDialogOpen] = useState(false);
  const [isEditUsersRolesDialogOpen, setIsEditUsersRolesDialogOpen] = useState(false);
  const [editingUsersRole, setEditingUsersRole] = useState<any | null>(null);
  const [usersRolesForm, setUsersRolesForm] = useState({ user_id: "", role_id: "" });
  const [isCreateUsersPermissionsDialogOpen, setIsCreateUsersPermissionsDialogOpen] = useState(false);
  const [isEditUsersPermissionsDialogOpen, setIsEditUsersPermissionsDialogOpen] = useState(false);
  const [editingUsersPermission, setEditingUsersPermission] = useState<any | null>(null);
  const [usersPermissionsForm, setUsersPermissionsForm] = useState({ user_id: "", permission_id: "" });
  const [isCreateRolesPermissionsDialogOpen, setIsCreateRolesPermissionsDialogOpen] = useState(false);
  const [isEditRolesPermissionsDialogOpen, setIsEditRolesPermissionsDialogOpen] = useState(false);
  const [editingRolesPermission, setEditingRolesPermission] = useState<any | null>(null);
  const [rolesPermissionsForm, setRolesPermissionsForm] = useState({ role_id: "", permission_id: "" });
  const [usersRolesSearchInput, setUsersRolesSearchInput] = useState("");
  const [usersRolesPage, setUsersRolesPage] = useState(1);
  const [usersRolesTotal, setUsersRolesTotal] = useState(0);
  const usersRolesPageSize = 10;
  const usersRolesSearchDebounce = useRef<NodeJS.Timeout | null>(null);
  const [usersPermissionsSearchInput, setUsersPermissionsSearchInput] = useState("");
  const [usersPermissionsPage, setUsersPermissionsPage] = useState(1);
  const [usersPermissionsTotal, setUsersPermissionsTotal] = useState(0);
  const usersPermissionsPageSize = 10;
  const usersPermissionsSearchDebounce = useRef<NodeJS.Timeout | null>(null);
  const [rolesPermissionsSearchInput, setRolesPermissionsSearchInput] = useState("");
  const [rolesPermissionsPage, setRolesPermissionsPage] = useState(1);
  const [rolesPermissionsTotal, setRolesPermissionsTotal] = useState(0);
  const rolesPermissionsPageSize = 10;
  const rolesPermissionsSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  const {
    usersRoles, usersRolesLoading, usersRolesError,
    usersPermissions, usersPermissionsLoading, usersPermissionsError,
    rolesPermissions, rolesPermissionsLoading, rolesPermissionsError,
    loadUsersRoles, createUsersRole, updateUsersRole, deleteUsersRole,
    loadUsersPermissions, createUsersPermission, updateUsersPermission, deleteUsersPermission,
    loadRolesPermissions, createRolesPermission, updateRolesPermission, deleteRolesPermission
  } = useAuthorizationsStore();

  useEffect(() => {
    if (databaseId) {
      loadDatabaseInfo();
      checkAuthorizationsStatus();
    }
  }, [databaseId]);

  const loadDatabaseInfo = async () => {
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.database.get({ filter: { uid: databaseId } });
      if (result.data) {
        setDatabaseInfo(result.data);
      }
    } catch (error: any) {
      console.error('Error loading database info:', error);
      toast.error('Failed to load database information');
    }
  };

  const checkAuthorizationsStatus = async () => {
    try {
      const client = getSodularClient();
      client.use(databaseId);
      
      // Check if authorization junction collections exist in this database
      const [usersRolesResult, usersPermissionsResult, rolesPermissionsResult] = await Promise.all([
        client.tables.get({ filter: { 'data.name': 'users_roles' } }),
        client.tables.get({ filter: { 'data.name': 'users_permissions' } }),
        client.tables.get({ filter: { 'data.name': 'roles_permissions' } })
      ]);

      if (usersRolesResult.data && usersPermissionsResult.data && rolesPermissionsResult.data) {
        setUsersRolesCollection(usersRolesResult.data);
        setUsersPermissionsCollection(usersPermissionsResult.data);
        setRolesPermissionsCollection(rolesPermissionsResult.data);
        setIsEnabled(true);
      }
    } catch (error: any) {
      console.error('Error checking authorizations status:', error);
      toast.error('Failed to check authorizations status');
    } finally {
      setIsLoading(false);
    }
  };

  const enableAuthorizations = async () => {
    setIsEnabling(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      
      // Create users_roles junction collection
      const usersRolesResult = await client.tables.create({
        data: {
          name: 'users_roles',
          description: 'Junction table for user-role assignments'
        }
      });

      // Create users_permissions junction collection
      const usersPermissionsResult = await client.tables.create({
        data: {
          name: 'users_permissions',
          description: 'Junction table for user-permission assignments'
        }
      });

      // Create roles_permissions junction collection
      const rolesPermissionsResult = await client.tables.create({
        data: {
          name: 'roles_permissions',
          description: 'Junction table for role-permission assignments'
        }
      });

      if (usersRolesResult.data && usersPermissionsResult.data && rolesPermissionsResult.data) {
        setUsersRolesCollection(usersRolesResult.data);
        setUsersPermissionsCollection(usersPermissionsResult.data);
        setRolesPermissionsCollection(rolesPermissionsResult.data);
        setIsEnabled(true);
        toast.success('Authorizations enabled successfully');
      }
    } catch (error: any) {
      console.error('Error enabling authorizations:', error);
      toast.error('Failed to enable authorizations');
    } finally {
      setIsEnabling(false);
    }
  };

  useEffect(() => {
    if (usersRolesCollection) loadUsersRoles(usersRolesCollection.uid, { page: usersRolesPage, pageSize: usersRolesPageSize });
  }, [usersRolesCollection, usersRolesPage, usersRolesPageSize]);

  useEffect(() => {
    if (usersPermissionsCollection) loadUsersPermissions(usersPermissionsCollection.uid, { page: usersPermissionsPage, pageSize: usersPermissionsPageSize });
  }, [usersPermissionsCollection, usersPermissionsPage, usersPermissionsPageSize]);

  useEffect(() => {
    if (rolesPermissionsCollection) loadRolesPermissions(rolesPermissionsCollection.uid, { page: rolesPermissionsPage, pageSize: rolesPermissionsPageSize });
  }, [rolesPermissionsCollection, rolesPermissionsPage, rolesPermissionsPageSize]);

  useEffect(() => {
    if (!usersRolesCollection) return;
    if (usersRolesSearchDebounce.current) clearTimeout(usersRolesSearchDebounce.current);
    usersRolesSearchDebounce.current = setTimeout(() => {
      fetchUsersRoles();
    }, 300);
    return () => {
      if (usersRolesSearchDebounce.current) clearTimeout(usersRolesSearchDebounce.current);
    };
  }, [usersRolesSearchInput, usersRolesPage, usersRolesCollection]);

  useEffect(() => {
    if (!usersPermissionsCollection) return;
    if (usersPermissionsSearchDebounce.current) clearTimeout(usersPermissionsSearchDebounce.current);
    usersPermissionsSearchDebounce.current = setTimeout(() => {
      fetchUsersPermissions();
    }, 300);
    return () => {
      if (usersPermissionsSearchDebounce.current) clearTimeout(usersPermissionsSearchDebounce.current);
    };
  }, [usersPermissionsSearchInput, usersPermissionsPage, usersPermissionsCollection]);

  useEffect(() => {
    if (!rolesPermissionsCollection) return;
    if (rolesPermissionsSearchDebounce.current) clearTimeout(rolesPermissionsSearchDebounce.current);
    rolesPermissionsSearchDebounce.current = setTimeout(() => {
      fetchRolesPermissions();
    }, 300);
    return () => {
      if (rolesPermissionsSearchDebounce.current) clearTimeout(rolesPermissionsSearchDebounce.current);
    };
  }, [rolesPermissionsSearchInput, rolesPermissionsPage, rolesPermissionsCollection]);

  const fetchUsersRoles = async () => {
    if (!usersRolesCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (usersRolesSearchInput) {
        const userRes = await client.auth.query({
          filter: {
            $or: [
              { 'data.email': { $regex: usersRolesSearchInput, $options: 'i' } },
              { 'data.username': { $regex: usersRolesSearchInput, $options: 'i' } }
            ]
          },
          take: 20,
          skip: 0
        });
        const userIds = (userRes.data?.list || []).map((u: any) => u.uid);
        const rolesCol = await client.tables.get({ filter: { 'data.name': 'roles' } });
        let roleIds: string[] = [];
        if (rolesCol.data) {
          const roleRes = await client.ref.from(rolesCol.data.uid).query({
            filter: {
              $or: [
                { 'data.name': { $regex: usersRolesSearchInput, $options: 'i' } }
              ]
            },
            take: 20,
            skip: 0
          });
          roleIds = (roleRes.data?.list || []).map((r: any) => r.uid);
        }
        filter = {
          $or: [
            ...(userIds.length > 0 ? [{ 'data.user_id': { $in: userIds } }] : []),
            ...(roleIds.length > 0 ? [{ 'data.role_id': { $in: roleIds } }] : []),
            { 'data.user_id': { $regex: usersRolesSearchInput, $options: 'i' } },
            { 'data.role_id': { $regex: usersRolesSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(usersRolesCollection.uid).query({
        filter,
        sort: { 'data.user_id': 'asc' },
        take: usersRolesPageSize,
        skip: (usersRolesPage - 1) * usersRolesPageSize
      });
      setUsersRolesTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch user-role assignments");
    }
  };

  const fetchUsersPermissions = async () => {
    if (!usersPermissionsCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (usersPermissionsSearchInput) {
        const userRes = await client.auth.query({
          filter: {
            $or: [
              { 'data.email': { $regex: usersPermissionsSearchInput, $options: 'i' } },
              { 'data.username': { $regex: usersPermissionsSearchInput, $options: 'i' } }
            ]
          },
          take: 20,
          skip: 0
        });
        const userIds = (userRes.data?.list || []).map((u: any) => u.uid);
        const permissionsCol = await client.tables.get({ filter: { 'data.name': 'permissions' } });
        let permissionIds: string[] = [];
        if (permissionsCol.data) {
          const permRes = await client.ref.from(permissionsCol.data.uid).query({
            filter: {
              $or: [
                { 'data.name': { $regex: usersPermissionsSearchInput, $options: 'i' } }
              ]
            },
            take: 20,
            skip: 0
          });
          permissionIds = (permRes.data?.list || []).map((p: any) => p.uid);
        }
        filter = {
          $or: [
            ...(userIds.length > 0 ? [{ 'data.user_id': { $in: userIds } }] : []),
            ...(permissionIds.length > 0 ? [{ 'data.permission_id': { $in: permissionIds } }] : []),
            { 'data.user_id': { $regex: usersPermissionsSearchInput, $options: 'i' } },
            { 'data.permission_id': { $regex: usersPermissionsSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(usersPermissionsCollection.uid).query({
        filter,
        sort: { 'data.user_id': 'asc' },
        take: usersPermissionsPageSize,
        skip: (usersPermissionsPage - 1) * usersPermissionsPageSize
      });
      setUsersPermissionsTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch user-permission assignments");
    }
  };

  const fetchRolesPermissions = async () => {
    if (!rolesPermissionsCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (rolesPermissionsSearchInput) {
        const rolesCol = await client.tables.get({ filter: { 'data.name': 'roles' } });
        let roleIds: string[] = [];
        if (rolesCol.data) {
          const roleRes = await client.ref.from(rolesCol.data.uid).query({
            filter: {
              $or: [
                { 'data.name': { $regex: rolesPermissionsSearchInput, $options: 'i' } }
              ]
            },
            take: 20,
            skip: 0
          });
          roleIds = (roleRes.data?.list || []).map((r: any) => r.uid);
        }
        const permissionsCol = await client.tables.get({ filter: { 'data.name': 'permissions' } });
        let permissionIds: string[] = [];
        if (permissionsCol.data) {
          const permRes = await client.ref.from(permissionsCol.data.uid).query({
            filter: {
              $or: [
                { 'data.name': { $regex: rolesPermissionsSearchInput, $options: 'i' } }
              ]
            },
            take: 20,
            skip: 0
          });
          permissionIds = (permRes.data?.list || []).map((p: any) => p.uid);
        }
        filter = {
          $or: [
            ...(roleIds.length > 0 ? [{ 'data.role_id': { $in: roleIds } }] : []),
            ...(permissionIds.length > 0 ? [{ 'data.permission_id': { $in: permissionIds } }] : []),
            { 'data.role_id': { $regex: rolesPermissionsSearchInput, $options: 'i' } },
            { 'data.permission_id': { $regex: rolesPermissionsSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(rolesPermissionsCollection.uid).query({
        filter,
        sort: { 'data.role_id': 'asc' },
        take: rolesPermissionsPageSize,
        skip: (rolesPermissionsPage - 1) * rolesPermissionsPageSize
      });
      setRolesPermissionsTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch role-permission assignments");
    }
  };

  const fetchUsersOptions = async (search: string) => {
    const client = getSodularClient();
    client.use(databaseId);
    const filter: any = {};
    if (search) {
      filter['$or'] = [
        { 'data.email': { $regex: search, $options: 'i' } },
        { 'data.username': { $regex: search, $options: 'i' } }
      ];
    }
    const response = await client.auth.query({
      filter,
      take: 10,
      skip: 0,
      sort: { 'data.email': 1 }
    });
    return (response.data?.list || []).map((user: any) => ({
      label: user.data.email + (user.data.username ? ` (${user.data.username})` : ''),
      value: user.uid
    }));
  };

  const fetchRolesOptions = async (search: string) => {
    if (!rolesPermissionsCollection && !usersRolesCollection) return [];
    const client = getSodularClient();
    client.use(databaseId);
    let filter: any = {};
    if (search) {
      filter = {
        $or: [
          { 'data.name': { $regex: search, $options: 'i' } },
          { 'data.description': { $regex: search, $options: 'i' } }
        ]
      };
    }
    const rolesCol = await client.tables.get({ filter: { 'data.name': 'roles' } });
    if (!rolesCol.data) return [];
    const result = await client.ref.from(rolesCol.data.uid).query({
      filter,
      sort: { 'data.name': 'asc' },
      take: 10,
      skip: 0
    });
    return (result.data?.list || []).map((role: any) => ({
      label: role.data.name,
      value: role.uid
    }));
  };

  const fetchPermissionsOptions = async (search: string) => {
    if (!rolesPermissionsCollection && !usersPermissionsCollection) return [];
    const client = getSodularClient();
    client.use(databaseId);
    let filter: any = {};
    if (search) {
      filter = {
        $or: [
          { 'data.name': { $regex: search, $options: 'i' } },
          { 'data.description': { $regex: search, $options: 'i' } }
        ]
      };
    }
    const permissionsCol = await client.tables.get({ filter: { 'data.name': 'permissions' } });
    if (!permissionsCol.data) return [];
    const result = await client.ref.from(permissionsCol.data.uid).query({
      filter,
      sort: { 'data.name': 'asc' },
      take: 10,
      skip: 0
    });
    return (result.data?.list || []).map((perm: any) => ({
      label: perm.data.name,
      value: perm.uid
    }));
  };

  const handleCreateUsersRole = async () => {
    if (!usersRolesCollection) return;
    if (!usersRolesForm.user_id || !usersRolesForm.role_id) {
      toast.error("Please select both user and role.");
      return;
    }
    const result = await createUsersRole(usersRolesCollection.uid, usersRolesForm);
    if (result.success) {
      toast.success("User-role assignment created successfully");
      setIsCreateUsersRolesDialogOpen(false);
      setUsersRolesForm({ user_id: "", role_id: "" });
    } else {
      toast.error(result.error || "Failed to create user-role assignment");
    }
  };

  const handleEditUsersRole = async () => {
    if (!usersRolesCollection || !editingUsersRole) return;
    if (!usersRolesForm.user_id || !usersRolesForm.role_id) {
      toast.error("Please select both user and role.");
      return;
    }
    const result = await updateUsersRole(usersRolesCollection.uid, editingUsersRole.uid, usersRolesForm);
    if (result.success) {
      toast.success("User-role assignment updated successfully");
      setIsEditUsersRolesDialogOpen(false);
      setEditingUsersRole(null);
      setUsersRolesForm({ user_id: "", role_id: "" });
    } else {
      toast.error(result.error || "Failed to update user-role assignment");
    }
  };

  const handleDeleteUsersRole = async (usersRole: any) => {
    if (!usersRolesCollection) return;
    if (!confirm(`Are you sure you want to delete this user-role assignment?`)) return;
    const result = await deleteUsersRole(usersRolesCollection.uid, usersRole.uid, { withSoftDelete: true });
    if (result.success) {
      toast.success("User-role assignment deleted successfully");
    } else {
      toast.error(result.error || "Failed to delete user-role assignment");
    }
  };

  const handleCreateUsersPermission = async () => {
    if (!usersPermissionsCollection) return;
    if (!usersPermissionsForm.user_id || !usersPermissionsForm.permission_id) {
      toast.error("Please select both user and permission.");
      return;
    }
    const result = await createUsersPermission(usersPermissionsCollection.uid, usersPermissionsForm);
    if (result.success) {
      toast.success("User-permission assignment created successfully");
      setIsCreateUsersPermissionsDialogOpen(false);
      setUsersPermissionsForm({ user_id: "", permission_id: "" });
    } else {
      toast.error(result.error || "Failed to create user-permission assignment");
    }
  };

  const handleEditUsersPermission = async () => {
    if (!usersPermissionsCollection || !editingUsersPermission) return;
    if (!usersPermissionsForm.user_id || !usersPermissionsForm.permission_id) {
      toast.error("Please select both user and permission.");
      return;
    }
    const result = await updateUsersPermission(usersPermissionsCollection.uid, editingUsersPermission.uid, usersPermissionsForm);
    if (result.success) {
      toast.success("User-permission assignment updated successfully");
      setIsEditUsersPermissionsDialogOpen(false);
      setEditingUsersPermission(null);
      setUsersPermissionsForm({ user_id: "", permission_id: "" });
    } else {
      toast.error(result.error || "Failed to update user-permission assignment");
    }
  };

  const handleDeleteUsersPermission = async (usersPermission: any) => {
    if (!usersPermissionsCollection) return;
    if (!confirm(`Are you sure you want to delete this user-permission assignment?`)) return;
    const result = await deleteUsersPermission(usersPermissionsCollection.uid, usersPermission.uid, { withSoftDelete: true });
    if (result.success) {
      toast.success("User-permission assignment deleted successfully");
    } else {
      toast.error(result.error || "Failed to delete user-permission assignment");
    }
  };

  const handleCreateRolesPermission = async () => {
    if (!rolesPermissionsCollection) return;
    if (!rolesPermissionsForm.role_id || !rolesPermissionsForm.permission_id) {
      toast.error("Please select both role and permission.");
      return;
    }
    const result = await createRolesPermission(rolesPermissionsCollection.uid, rolesPermissionsForm);
    if (result.success) {
      toast.success("Role-permission assignment created successfully");
      setIsCreateRolesPermissionsDialogOpen(false);
      setRolesPermissionsForm({ role_id: "", permission_id: "" });
    } else {
      toast.error(result.error || "Failed to create role-permission assignment");
    }
  };

  const handleEditRolesPermission = async () => {
    if (!rolesPermissionsCollection || !editingRolesPermission) return;
    if (!rolesPermissionsForm.role_id || !rolesPermissionsForm.permission_id) {
      toast.error("Please select both role and permission.");
      return;
    }
    const result = await updateRolesPermission(rolesPermissionsCollection.uid, editingRolesPermission.uid, rolesPermissionsForm);
    if (result.success) {
      toast.success("Role-permission assignment updated successfully");
      setIsEditRolesPermissionsDialogOpen(false);
      setEditingRolesPermission(null);
      setRolesPermissionsForm({ role_id: "", permission_id: "" });
    } else {
      toast.error(result.error || "Failed to update role-permission assignment");
    }
  };

  const handleDeleteRolesPermission = async (rolesPermission: any) => {
    if (!rolesPermissionsCollection) return;
    if (!confirm(`Are you sure you want to delete this role-permission assignment?`)) return;
    const result = await deleteRolesPermission(rolesPermissionsCollection.uid, rolesPermission.uid, { withSoftDelete: true });
    if (result.success) {
      toast.success("Role-permission assignment deleted successfully");
    } else {
      toast.error(result.error || "Failed to delete role-permission assignment");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Authorizations</h1>
          <p className="text-muted-foreground">Manage user-role and user-permission assignments</p>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Authorizations</h1>
            <p className="text-muted-foreground">Manage user-role and user-permission assignments</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Database className="w-3 h-3 mr-1" />
              {databaseInfo?.data.name || 'Database'}
            </Badge>
          </div>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <UserCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Authorizations Not Enabled</CardTitle>
            <CardDescription>
              Enable authorizations to manage user-role and user-permission assignments for ABAC (Attribute-Based Access Control) in this database.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={enableAuthorizations} 
              disabled={isEnabling}
              size="lg"
            >
              {isEnabling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enabling...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Enable Authorizations
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Authorizations</h1>
          <p className="text-muted-foreground">Manage user-role and user-permission assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Database className="w-3 h-3 mr-1" />
            {databaseInfo?.data.name || 'Database'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="users-roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users-roles">Users | Roles</TabsTrigger>
          <TabsTrigger value="users-permissions">Users | Permissions</TabsTrigger>
          <TabsTrigger value="roles-permissions">Roles | Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users-roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Role Assignments</CardTitle>
              <CardDescription>
                Assign roles to users for role-based access control in this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreateUsersRolesDialogOpen} onOpenChange={setIsCreateUsersRolesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Role to User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <AsyncSearchSelect
                        value={usersRolesForm.user_id}
                        onChange={v => setUsersRolesForm({ ...usersRolesForm, user_id: v })}
                        fetchOptions={fetchUsersOptions}
                        placeholder="Select user..."
                      />
                      <AsyncSearchSelect
                        value={usersRolesForm.role_id}
                        onChange={v => setUsersRolesForm({ ...usersRolesForm, role_id: v })}
                        fetchOptions={fetchRolesOptions}
                        placeholder="Select role..."
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateUsersRolesDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUsersRole}>Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search user or role..."
                    value={usersRolesSearchInput}
                    onChange={e => {
                      setUsersRolesSearchInput(e.target.value);
                      setUsersRolesPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {usersRolesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                  ) : usersRoles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No user-role assignments found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">User ID</th>
                          <th className="text-left">Role ID</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersRoles.map(usersRole => (
                          <tr key={usersRole.uid}>
                            <td>{usersRole.data.user_id}</td>
                            <td>{usersRole.data.role_id}</td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingUsersRole(usersRole);
                                setUsersRolesForm({
                                  user_id: usersRole.data.user_id,
                                  role_id: usersRole.data.role_id
                                });
                                setIsEditUsersRolesDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUsersRole(usersRole)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="border-t p-2 sticky bottom-0 bg-background z-10">
                  <div className="flex justify-between items-center">
                    <Button size="sm" variant="outline" disabled={usersRolesPage === 1} onClick={() => setUsersRolesPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {usersRolesPage} / {Math.ceil(usersRolesTotal / usersRolesPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={usersRolesPage * usersRolesPageSize >= usersRolesTotal} onClick={() => setUsersRolesPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditUsersRolesDialogOpen} onOpenChange={setIsEditUsersRolesDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit User-Role Assignment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <AsyncSearchSelect
                      value={usersRolesForm.user_id}
                      onChange={v => setUsersRolesForm({ ...usersRolesForm, user_id: v })}
                      fetchOptions={fetchUsersOptions}
                      placeholder="Select user..."
                    />
                    <AsyncSearchSelect
                      value={usersRolesForm.role_id}
                      onChange={v => setUsersRolesForm({ ...usersRolesForm, role_id: v })}
                      fetchOptions={fetchRolesOptions}
                      placeholder="Select role..."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditUsersRolesDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditUsersRole}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users-permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Permission Assignments</CardTitle>
              <CardDescription>
                Assign specific permissions directly to users in this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreateUsersPermissionsDialogOpen} onOpenChange={setIsCreateUsersPermissionsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Permission
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Permission to User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <AsyncSearchSelect
                        value={usersPermissionsForm.user_id}
                        onChange={v => setUsersPermissionsForm({ ...usersPermissionsForm, user_id: v })}
                        fetchOptions={fetchUsersOptions}
                        placeholder="Select user..."
                      />
                      <AsyncSearchSelect
                        value={usersPermissionsForm.permission_id}
                        onChange={v => setUsersPermissionsForm({ ...usersPermissionsForm, permission_id: v })}
                        fetchOptions={fetchPermissionsOptions}
                        placeholder="Select permission..."
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateUsersPermissionsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUsersPermission}>Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search user or permission..."
                    value={usersPermissionsSearchInput}
                    onChange={e => {
                      setUsersPermissionsSearchInput(e.target.value);
                      setUsersPermissionsPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {usersPermissionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                  ) : usersPermissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No user-permission assignments found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">User ID</th>
                          <th className="text-left">Permission ID</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersPermissions.map(usersPermission => (
                          <tr key={usersPermission.uid}>
                            <td>{usersPermission.data.user_id}</td>
                            <td>{usersPermission.data.permission_id}</td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingUsersPermission(usersPermission);
                                setUsersPermissionsForm({
                                  user_id: usersPermission.data.user_id,
                                  permission_id: usersPermission.data.permission_id
                                });
                                setIsEditUsersPermissionsDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUsersPermission(usersPermission)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="border-t p-2 sticky bottom-0 bg-background z-10">
                  <div className="flex justify-between items-center">
                    <Button size="sm" variant="outline" disabled={usersPermissionsPage === 1} onClick={() => setUsersPermissionsPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {usersPermissionsPage} / {Math.ceil(usersPermissionsTotal / usersPermissionsPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={usersPermissionsPage * usersPermissionsPageSize >= usersPermissionsTotal} onClick={() => setUsersPermissionsPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditUsersPermissionsDialogOpen} onOpenChange={setIsEditUsersPermissionsDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit User-Permission Assignment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <AsyncSearchSelect
                      value={usersPermissionsForm.user_id}
                      onChange={v => setUsersPermissionsForm({ ...usersPermissionsForm, user_id: v })}
                      fetchOptions={fetchUsersOptions}
                      placeholder="Select user..."
                    />
                    <AsyncSearchSelect
                      value={usersPermissionsForm.permission_id}
                      onChange={v => setUsersPermissionsForm({ ...usersPermissionsForm, permission_id: v })}
                      fetchOptions={fetchPermissionsOptions}
                      placeholder="Select permission..."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditUsersPermissionsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditUsersPermission}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles-permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Permission Assignments</CardTitle>
              <CardDescription>
                Assign permissions to roles for hierarchical access control in this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreateRolesPermissionsDialogOpen} onOpenChange={setIsCreateRolesPermissionsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Permission
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Permission to Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <AsyncSearchSelect
                        value={rolesPermissionsForm.role_id}
                        onChange={v => setRolesPermissionsForm({ ...rolesPermissionsForm, role_id: v })}
                        fetchOptions={fetchRolesOptions}
                        placeholder="Select role..."
                      />
                      <AsyncSearchSelect
                        value={rolesPermissionsForm.permission_id}
                        onChange={v => setRolesPermissionsForm({ ...rolesPermissionsForm, permission_id: v })}
                        fetchOptions={fetchPermissionsOptions}
                        placeholder="Select permission..."
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateRolesPermissionsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRolesPermission}>Assign</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search role or permission..."
                    value={rolesPermissionsSearchInput}
                    onChange={e => {
                      setRolesPermissionsSearchInput(e.target.value);
                      setRolesPermissionsPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {rolesPermissionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                  ) : rolesPermissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No role-permission assignments found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Role ID</th>
                          <th className="text-left">Permission ID</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rolesPermissions.map(rolesPermission => (
                          <tr key={rolesPermission.uid}>
                            <td>{rolesPermission.data.role_id}</td>
                            <td>{rolesPermission.data.permission_id}</td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingRolesPermission(rolesPermission);
                                setRolesPermissionsForm({
                                  role_id: rolesPermission.data.role_id,
                                  permission_id: rolesPermission.data.permission_id
                                });
                                setIsEditRolesPermissionsDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRolesPermission(rolesPermission)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="border-t p-2 sticky bottom-0 bg-background z-10">
                  <div className="flex justify-between items-center">
                    <Button size="sm" variant="outline" disabled={rolesPermissionsPage === 1} onClick={() => setRolesPermissionsPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {rolesPermissionsPage} / {Math.ceil(rolesPermissionsTotal / rolesPermissionsPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={rolesPermissionsPage * rolesPermissionsPageSize >= rolesPermissionsTotal} onClick={() => setRolesPermissionsPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditRolesPermissionsDialogOpen} onOpenChange={setIsEditRolesPermissionsDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Role-Permission Assignment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <AsyncSearchSelect
                      value={rolesPermissionsForm.role_id}
                      onChange={v => setRolesPermissionsForm({ ...rolesPermissionsForm, role_id: v })}
                      fetchOptions={fetchRolesOptions}
                      placeholder="Select role..."
                    />
                    <AsyncSearchSelect
                      value={rolesPermissionsForm.permission_id}
                      onChange={v => setRolesPermissionsForm({ ...rolesPermissionsForm, permission_id: v })}
                      fetchOptions={fetchPermissionsOptions}
                      placeholder="Select permission..."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditRolesPermissionsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditRolesPermission}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
