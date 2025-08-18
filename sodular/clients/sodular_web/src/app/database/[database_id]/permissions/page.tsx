"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Edit, Trash2, Plus } from "lucide-react";
import { getSodularClient } from "@/services";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

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

export default function DatabasePermissionsPage() {
  const params = useParams();
  const databaseId = params.database_id as string;
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [rulesCollection, setRulesCollection] = useState<Collection | null>(null);
  const [rolesCollection, setRolesCollection] = useState<Collection | null>(null);
  const [permissionsCollection, setPermissionsCollection] = useState<Collection | null>(null);

  // CRUD state (copied/adapted from home/permissions/page.tsx)
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);
  const [isEditRuleDialogOpen, setIsEditRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [ruleForm, setRuleForm] = useState({ name: "", description: "", condition: "" });
  const [rulesSearchInput, setRulesSearchInput] = useState("");
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesTotal, setRulesTotal] = useState(0);
  const rulesPageSize = 10;
  const rulesSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [roles, setRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", slug: "", description: "" });
  const [rolesSearchInput, setRolesSearchInput] = useState("");
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesTotal, setRolesTotal] = useState(0);
  const rolesPageSize = 10;
  const rolesSearchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [isCreatePermissionDialogOpen, setIsCreatePermissionDialogOpen] = useState(false);
  const [isEditPermissionDialogOpen, setIsEditPermissionDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<any | null>(null);
  const [permissionForm, setPermissionForm] = useState({ name: "", slug: "", description: "", rule_id: "", path: "", method: "get" });
  const [permissionsSearchInput, setPermissionsSearchInput] = useState("");
  const [permissionsPage, setPermissionsPage] = useState(1);
  const [permissionsTotal, setPermissionsTotal] = useState(0);
  const permissionsPageSize = 10;
  const permissionsSearchDebounce = useRef<NodeJS.Timeout | null>(null);
  const [ruleDropdown, setRuleDropdown] = useState({
    open: false,
    search: "",
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    options: [] as { uid: string; name: string; description?: string }[],
  });
  const [selectedRule, setSelectedRule] = useState<{ uid: string; name: string } | null>(null);
  const validTabs = ["rules", "roles", "permissions"];
  const [activeTab, setActiveTab] = useState("rules");

  useEffect(() => {
    if (databaseId) {
      loadDatabaseInfo();
      checkPermissionsStatus();
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

  const checkPermissionsStatus = async () => {
    try {
      const client = getSodularClient();
      client.use(databaseId);
      // Check if rules, roles, and permissions collections exist in this database
      const [rulesResult, rolesResult, permissionsResult] = await Promise.all([
        client.tables.get({ filter: { 'data.name': 'rules' } }),
        client.tables.get({ filter: { 'data.name': 'roles' } }),
        client.tables.get({ filter: { 'data.name': 'permissions' } })
      ]);
      if (rulesResult.data && rolesResult.data && permissionsResult.data) {
        setRulesCollection(rulesResult.data);
        setRolesCollection(rolesResult.data);
        setPermissionsCollection(permissionsResult.data);
        setIsEnabled(true);
      }
    } catch (error: any) {
      console.error('Error checking permissions status:', error);
      toast.error('Failed to check permissions status');
    } finally {
      setIsLoading(false);
    }
  };

  const enablePermissions = async () => {
    setIsEnabling(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      // Create rules collection
      const rulesResult = await client.tables.create({
        data: {
          name: 'rules',
          description: 'Access control rules and conditions'
        }
      });
      // Create roles collection
      const rolesResult = await client.tables.create({
        data: {
          name: 'roles',
          description: 'User roles and role definitions'
        }
      });
      // Create permissions collection
      const permissionsResult = await client.tables.create({
        data: {
          name: 'permissions',
          description: 'Access permissions and policies'
        }
      });
      if (rulesResult.data && rolesResult.data && permissionsResult.data) {
        setRulesCollection(rulesResult.data);
        setRolesCollection(rolesResult.data);
        setPermissionsCollection(permissionsResult.data);
        setIsEnabled(true);
        toast.success('Permissions enabled successfully');
      }
    } catch (error: any) {
      console.error('Error enabling permissions:', error);
      toast.error('Failed to enable permissions');
    } finally {
      setIsEnabling(false);
    }
  };

  // --- RULES CRUD HANDLERS ---
  const fetchRules = async () => {
    if (!rulesCollection) return;
    setRulesLoading(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (rulesSearchInput) {
        filter = {
          $or: [
            { 'data.name': { $regex: rulesSearchInput, $options: 'i' } },
            { 'data.description': { $regex: rulesSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(rulesCollection.uid).query({
        filter,
        sort: { 'data.name': 'asc' },
        take: rulesPageSize,
        skip: (rulesPage - 1) * rulesPageSize
      });
      setRules(result.data?.list || []);
      setRulesTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch rules");
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    if (rulesCollection) fetchRules();
  }, [rulesCollection]);

  useEffect(() => {
    if (!rulesCollection) return;
    if (rulesSearchDebounce.current) clearTimeout(rulesSearchDebounce.current);
    rulesSearchDebounce.current = setTimeout(() => {
      fetchRules();
    }, 300);
    return () => {
      if (rulesSearchDebounce.current) clearTimeout(rulesSearchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesSearchInput, rulesPage, rulesCollection]);

  const handleCreateRule = async () => {
    if (!rulesCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rulesCollection.uid).create({
        data: { ...ruleForm }
      });
      if (result.data) {
        toast.success("Rule created successfully");
        setIsCreateRuleDialogOpen(false);
        setRuleForm({ name: "", description: "", condition: "" });
        fetchRules();
      }
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  const handleEditRule = async () => {
    if (!rulesCollection || !editingRule) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rulesCollection.uid).patch(
        { uid: editingRule.uid },
        { data: { ...ruleForm } }
      );
      if (result.data) {
        toast.success("Rule updated successfully");
        setIsEditRuleDialogOpen(false);
        setEditingRule(null);
        setRuleForm({ name: "", description: "", condition: "" });
        fetchRules();
      }
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const handleDeleteRule = async (rule: any) => {
    if (!rulesCollection) return;
    if (!confirm(`Are you sure you want to delete rule "${rule.data.name}"?`)) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rulesCollection.uid).delete(
        { uid: rule.uid },
        { withSoftDelete: true }
      );
      if (result.data) {
        toast.success("Rule deleted successfully");
        fetchRules();
      }
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  // --- ROLES CRUD HANDLERS ---
  const fetchRoles = async () => {
    if (!rolesCollection) return;
    setRolesLoading(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (rolesSearchInput) {
        filter = {
          $or: [
            { 'data.name': { $regex: rolesSearchInput, $options: 'i' } },
            { 'data.description': { $regex: rolesSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(rolesCollection.uid).query({
        filter,
        sort: { 'data.name': 'asc' },
        take: rolesPageSize,
        skip: (rolesPage - 1) * rolesPageSize
      });
      setRoles(result.data?.list || []);
      setRolesTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch roles");
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    if (rolesCollection) fetchRoles();
  }, [rolesCollection]);

  useEffect(() => {
    if (!rolesCollection) return;
    if (rolesSearchDebounce.current) clearTimeout(rolesSearchDebounce.current);
    rolesSearchDebounce.current = setTimeout(() => {
      fetchRoles();
    }, 300);
    return () => {
      if (rolesSearchDebounce.current) clearTimeout(rolesSearchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesSearchInput, rolesPage, rolesCollection]);

  const handleCreateRole = async () => {
    if (!rolesCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rolesCollection.uid).create({
        data: { ...roleForm }
      });
      if (result.data) {
        toast.success("Role created successfully");
        setIsCreateRoleDialogOpen(false);
        setRoleForm({ name: "", slug: "", description: "" });
        fetchRoles();
      }
    } catch (error) {
      toast.error("Failed to create role");
    }
  };

  const handleEditRole = async () => {
    if (!rolesCollection || !editingRole) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rolesCollection.uid).patch(
        { uid: editingRole.uid },
        { data: { ...roleForm } }
      );
      if (result.data) {
        toast.success("Role updated successfully");
        setIsEditRoleDialogOpen(false);
        setEditingRole(null);
        setRoleForm({ name: "", slug: "", description: "" });
        fetchRoles();
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (!rolesCollection) return;
    if (!confirm(`Are you sure you want to delete role "${role.data.name}"?`)) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(rolesCollection.uid).delete(
        { uid: role.uid },
        { withSoftDelete: true }
      );
      if (result.data) {
        toast.success("Role deleted successfully");
        fetchRoles();
      }
    } catch (error) {
      toast.error("Failed to delete role");
    }
  };

  // --- PERMISSIONS CRUD HANDLERS ---
  const fetchPermissions = async () => {
    if (!permissionsCollection) return;
    setPermissionsLoading(true);
    try {
      const client = getSodularClient();
      client.use(databaseId);
      let filter: any = {};
      if (permissionsSearchInput) {
        filter = {
          $or: [
            { 'data.name': { $regex: permissionsSearchInput, $options: 'i' } },
            { 'data.description': { $regex: permissionsSearchInput, $options: 'i' } }
          ]
        };
      }
      const result = await client.ref.from(permissionsCollection.uid).query({
        filter,
        sort: { 'data.name': 'asc' },
        take: permissionsPageSize,
        skip: (permissionsPage - 1) * permissionsPageSize
      });
      setPermissions(result.data?.list || []);
      setPermissionsTotal(result.data?.total || 0);
    } catch (error) {
      toast.error("Failed to fetch permissions");
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    if (permissionsCollection) fetchPermissions();
  }, [permissionsCollection]);

  useEffect(() => {
    if (!permissionsCollection) return;
    if (permissionsSearchDebounce.current) clearTimeout(permissionsSearchDebounce.current);
    permissionsSearchDebounce.current = setTimeout(() => {
      fetchPermissions();
    }, 300);
    return () => {
      if (permissionsSearchDebounce.current) clearTimeout(permissionsSearchDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsSearchInput, permissionsPage, permissionsCollection]);

  const handleCreatePermission = async () => {
    if (!permissionsCollection) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(permissionsCollection.uid).create({
        data: { ...permissionForm }
      });
      if (result.data) {
        toast.success("Permission created successfully");
        setIsCreatePermissionDialogOpen(false);
        setPermissionForm({ name: "", slug: "", description: "", rule_id: "", path: "", method: "get" });
        fetchPermissions();
      }
    } catch (error) {
      toast.error("Failed to create permission");
    }
  };

  const handleEditPermission = async () => {
    if (!permissionsCollection || !editingPermission) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(permissionsCollection.uid).patch(
        { uid: editingPermission.uid },
        { data: { ...permissionForm } }
      );
      if (result.data) {
        toast.success("Permission updated successfully");
        setIsEditPermissionDialogOpen(false);
        setEditingPermission(null);
        setPermissionForm({ name: "", slug: "", description: "", rule_id: "", path: "", method: "get" });
        fetchPermissions();
      }
    } catch (error) {
      toast.error("Failed to update permission");
    }
  };

  const handleDeletePermission = async (permission: any) => {
    if (!permissionsCollection) return;
    if (!confirm(`Are you sure you want to delete permission "${permission.data.name}"?`)) return;
    try {
      const client = getSodularClient();
      client.use(databaseId);
      const result = await client.ref.from(permissionsCollection.uid).delete(
        { uid: permission.uid },
        { withSoftDelete: true }
      );
      if (result.data) {
        toast.success("Permission deleted successfully");
        fetchPermissions();
      }
    } catch (error) {
      toast.error("Failed to delete permission");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">Manage access control rules, roles, and permissions</p>
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
            <h1 className="text-3xl font-bold">Permissions</h1>
            <p className="text-muted-foreground">Manage access control rules, roles, and permissions</p>
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
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>Permissions Not Enabled</CardTitle>
            <CardDescription>
              Enable permissions to manage access control rules, roles, and permissions for this database.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={enablePermissions} 
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
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Permissions
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
          <h1 className="text-3xl font-bold">Permissions</h1>
          <p className="text-muted-foreground">Manage access control rules, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Database className="w-3 h-3 mr-1" />
            {databaseInfo?.data.name || 'Database'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Rules</CardTitle>
              <CardDescription>
                Define conditions and rules for access control in this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreateRuleDialogOpen} onOpenChange={setIsCreateRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Rule</DialogTitle>
                      <DialogDescription>Fill in the details to create a new access control rule.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Rule Name"
                        value={ruleForm.name}
                        onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                      />
                      <Textarea
                        placeholder="Description"
                        value={ruleForm.description}
                        onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                      />
                      <Textarea
                        placeholder="Condition (e.g. user.role === 'admin')"
                        value={ruleForm.condition}
                        onChange={e => setRuleForm({ ...ruleForm, condition: e.target.value })}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateRuleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRule}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search rules..."
                    value={rulesSearchInput}
                    onChange={e => {
                      setRulesSearchInput(e.target.value);
                      setRulesPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {rulesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
                  ) : rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No rules found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Name</th>
                          <th className="text-left">Description</th>
                          <th className="text-left">Condition</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map(rule => (
                          <tr key={rule.uid}>
                            <td>{rule.data.name}</td>
                            <td>{rule.data.description}</td>
                            <td><code>{rule.data.condition}</code></td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingRule(rule);
                                setRuleForm({
                                  name: rule.data.name,
                                  description: rule.data.description,
                                  condition: rule.data.condition
                                });
                                setIsEditRuleDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule)}>
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
                    <Button size="sm" variant="outline" disabled={rulesPage === 1} onClick={() => setRulesPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {rulesPage} / {Math.ceil(rulesTotal / rulesPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={rulesPage * rulesPageSize >= rulesTotal} onClick={() => setRulesPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditRuleDialogOpen} onOpenChange={setIsEditRuleDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Rule</DialogTitle>
                    <DialogDescription>Edit the details of this access control rule.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Rule Name"
                      value={ruleForm.name}
                      onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description"
                      value={ruleForm.description}
                      onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                    />
                    <Textarea
                      placeholder="Condition (e.g. user.role === 'admin')"
                      value={ruleForm.condition}
                      onChange={e => setRuleForm({ ...ruleForm, condition: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditRuleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditRule}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>
                Define and manage user roles and role hierarchies for this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreateRoleDialogOpen} onOpenChange={setIsCreateRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Role</DialogTitle>
                      <DialogDescription>Fill in the details to create a new user role.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Role Name"
                        value={roleForm.name}
                        onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                      />
                      <Input
                        placeholder="Slug (unique)"
                        value={roleForm.slug}
                        onChange={e => setRoleForm({ ...roleForm, slug: e.target.value })}
                      />
                      <Textarea
                        placeholder="Description"
                        value={roleForm.description}
                        onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateRoleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateRole}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search roles..."
                    value={rolesSearchInput}
                    onChange={e => {
                      setRolesSearchInput(e.target.value);
                      setRolesPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {rolesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading roles...</div>
                  ) : roles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No roles found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Name</th>
                          <th className="text-left">Slug</th>
                          <th className="text-left">Description</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map(role => (
                          <tr key={role.uid}>
                            <td>{role.data.name}</td>
                            <td>{role.data.slug}</td>
                            <td>{role.data.description}</td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingRole(role);
                                setRoleForm({
                                  name: role.data.name,
                                  slug: role.data.slug,
                                  description: role.data.description
                                });
                                setIsEditRoleDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role)}>
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
                    <Button size="sm" variant="outline" disabled={rolesPage === 1} onClick={() => setRolesPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {rolesPage} / {Math.ceil(rolesTotal / rolesPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={rolesPage * rolesPageSize >= rolesTotal} onClick={() => setRolesPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                    <DialogDescription>Edit the details of this user role.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Role Name"
                      value={roleForm.name}
                      onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    />
                    <Input
                      placeholder="Slug (unique)"
                      value={roleForm.slug}
                      onChange={e => setRoleForm({ ...roleForm, slug: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description"
                      value={roleForm.description}
                      onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditRole}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Permissions</CardTitle>
              <CardDescription>
                Define specific permissions and access policies for this database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={isCreatePermissionDialogOpen} onOpenChange={setIsCreatePermissionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Permission
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Permission</DialogTitle>
                      <DialogDescription>Fill in the details to create a new access permission.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Permission Name"
                        value={permissionForm.name}
                        onChange={e => setPermissionForm({ ...permissionForm, name: e.target.value })}
                      />
                      <Input
                        placeholder="Slug (unique)"
                        value={permissionForm.slug}
                        onChange={e => setPermissionForm({ ...permissionForm, slug: e.target.value })}
                      />
                      <Textarea
                        placeholder="Description"
                        value={permissionForm.description}
                        onChange={e => setPermissionForm({ ...permissionForm, description: e.target.value })}
                      />
                      <Input
                        placeholder="Rule ID"
                        value={permissionForm.rule_id}
                        onChange={e => setPermissionForm({ ...permissionForm, rule_id: e.target.value })}
                      />
                      <Input
                        placeholder="Path (e.g. /database)"
                        value={permissionForm.path}
                        onChange={e => setPermissionForm({ ...permissionForm, path: e.target.value })}
                      />
                      <select
                        value={permissionForm.method}
                        onChange={e => setPermissionForm({ ...permissionForm, method: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="get">GET</option>
                        <option value="post">POST</option>
                        <option value="put">PUT</option>
                        <option value="patch">PATCH</option>
                        <option value="delete">DELETE</option>
                      </select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreatePermissionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePermission}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col min-h-[400px]">
                <div className="mb-2">
                  <Input
                    placeholder="Search permissions..."
                    value={permissionsSearchInput}
                    onChange={e => {
                      setPermissionsSearchInput(e.target.value);
                      setPermissionsPage(1);
                    }}
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  {permissionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
                  ) : permissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No permissions found</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Name</th>
                          <th className="text-left">Slug</th>
                          <th className="text-left">Description</th>
                          <th className="text-left">Rule ID</th>
                          <th className="text-left">Path</th>
                          <th className="text-left">Method</th>
                          <th className="text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissions.map(permission => (
                          <tr key={permission.uid}>
                            <td>{permission.data.name}</td>
                            <td>{permission.data.slug}</td>
                            <td>{permission.data.description}</td>
                            <td>{permission.data.rule_id}</td>
                            <td>{permission.data.path}</td>
                            <td>{permission.data.method}</td>
                            <td>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingPermission(permission);
                                setPermissionForm({
                                  name: permission.data.name,
                                  slug: permission.data.slug,
                                  description: permission.data.description,
                                  rule_id: permission.data.rule_id,
                                  path: permission.data.path,
                                  method: permission.data.method
                                });
                                setIsEditPermissionDialogOpen(true);
                              }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeletePermission(permission)}>
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
                    <Button size="sm" variant="outline" disabled={permissionsPage === 1} onClick={() => setPermissionsPage(p => Math.max(1, p - 1))}>Prev</Button>
                    <span className="text-xs">Page {permissionsPage} / {Math.ceil(permissionsTotal / permissionsPageSize) || 1}</span>
                    <Button size="sm" variant="outline" disabled={permissionsPage * permissionsPageSize >= permissionsTotal} onClick={() => setPermissionsPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </div>
              <Dialog open={isEditPermissionDialogOpen} onOpenChange={setIsEditPermissionDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Permission</DialogTitle>
                    <DialogDescription>Edit the details of this access permission.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Permission Name"
                      value={permissionForm.name}
                      onChange={e => setPermissionForm({ ...permissionForm, name: e.target.value })}
                    />
                    <Input
                      placeholder="Slug (unique)"
                      value={permissionForm.slug}
                      onChange={e => setPermissionForm({ ...permissionForm, slug: e.target.value })}
                    />
                    <Textarea
                      placeholder="Description"
                      value={permissionForm.description}
                      onChange={e => setPermissionForm({ ...permissionForm, description: e.target.value })}
                    />
                    <Input
                      placeholder="Rule ID"
                      value={permissionForm.rule_id}
                      onChange={e => setPermissionForm({ ...permissionForm, rule_id: e.target.value })}
                    />
                    <Input
                      placeholder="Path (e.g. /database)"
                      value={permissionForm.path}
                      onChange={e => setPermissionForm({ ...permissionForm, path: e.target.value })}
                    />
                    <select
                      value={permissionForm.method}
                      onChange={e => setPermissionForm({ ...permissionForm, method: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="get">GET</option>
                      <option value="post">POST</option>
                      <option value="put">PUT</option>
                      <option value="patch">PATCH</option>
                      <option value="delete">DELETE</option>
                    </select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditPermissionDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditPermission}>Update</Button>
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
