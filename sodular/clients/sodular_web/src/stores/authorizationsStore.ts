import { create } from 'zustand';
import { getSodularClient } from '@/services';
import { Ref } from '@/lib/sodular/types/schema/ref.schema';

interface AssignmentPagination {
  page: number;
  pageSize: number;
  total: number;
}

interface AssignmentState {
  // State for users_roles
  usersRoles: Ref[];
  usersRolesLoading: boolean;
  usersRolesError: string | null;
  usersRolesPagination: AssignmentPagination;
  // State for users_permissions
  usersPermissions: Ref[];
  usersPermissionsLoading: boolean;
  usersPermissionsError: string | null;
  usersPermissionsPagination: AssignmentPagination;
  // State for roles_permissions
  rolesPermissions: Ref[];
  rolesPermissionsLoading: boolean;
  rolesPermissionsError: string | null;
  rolesPermissionsPagination: AssignmentPagination;

  // Actions for users_roles
  loadUsersRoles: (collectionUid: string, options?: { page?: number; pageSize?: number }) => Promise<void>;
  createUsersRole: (collectionUid: string, data: { user_id: string; role_id: string }) => Promise<{ success: boolean; error?: string }>;
  updateUsersRole: (collectionUid: string, uid: string, data: { user_id: string; role_id: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUsersRole: (collectionUid: string, uid: string, options?: { withSoftDelete?: boolean }) => Promise<{ success: boolean; error?: string }>;

  // Actions for users_permissions
  loadUsersPermissions: (collectionUid: string, options?: { page?: number; pageSize?: number }) => Promise<void>;
  createUsersPermission: (collectionUid: string, data: { user_id: string; permission_id: string }) => Promise<{ success: boolean; error?: string }>;
  updateUsersPermission: (collectionUid: string, uid: string, data: { user_id: string; permission_id: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUsersPermission: (collectionUid: string, uid: string, options?: { withSoftDelete?: boolean }) => Promise<{ success: boolean; error?: string }>;

  // Actions for roles_permissions
  loadRolesPermissions: (collectionUid: string, options?: { page?: number; pageSize?: number }) => Promise<void>;
  createRolesPermission: (collectionUid: string, data: { role_id: string; permission_id: string }) => Promise<{ success: boolean; error?: string }>;
  updateRolesPermission: (collectionUid: string, uid: string, data: { role_id: string; permission_id: string }) => Promise<{ success: boolean; error?: string }>;
  deleteRolesPermission: (collectionUid: string, uid: string, options?: { withSoftDelete?: boolean }) => Promise<{ success: boolean; error?: string }>;

  // Utility setters
  setUsersRolesError: (error: string | null) => void;
  setUsersPermissionsError: (error: string | null) => void;
  setRolesPermissionsError: (error: string | null) => void;
}

export const useAuthorizationsStore = create<AssignmentState>((set, get) => ({
  // Initial state
  usersRoles: [],
  usersRolesLoading: false,
  usersRolesError: null,
  usersRolesPagination: { page: 1, pageSize: 20, total: 0 },
  usersPermissions: [],
  usersPermissionsLoading: false,
  usersPermissionsError: null,
  usersPermissionsPagination: { page: 1, pageSize: 20, total: 0 },
  rolesPermissions: [],
  rolesPermissionsLoading: false,
  rolesPermissionsError: null,
  rolesPermissionsPagination: { page: 1, pageSize: 20, total: 0 },

  // Users-Roles
  loadUsersRoles: async (collectionUid, options = {}) => {
    const { page = 1, pageSize = 20 } = options;
    set({ usersRolesLoading: true, usersRolesError: null });
    try {
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).query({
        filter: {},
        sort: { createdAt: -1 },
        take: pageSize,
        skip: (page - 1) * pageSize
      });
      if (result.error) {
        set({ usersRolesError: result.error, usersRolesLoading: false });
        return;
      }
      set({
        usersRoles: result.data?.list || [],
        usersRolesPagination: { page, pageSize, total: result.data?.total || 0 },
        usersRolesLoading: false,
        usersRolesError: null
      });
    } catch (err: any) {
      set({ usersRolesError: err.message || 'Failed to load users_roles', usersRolesLoading: false });
    }
  },
  createUsersRole: async (collectionUid, data) => {
    try {
      set({ usersRolesLoading: true, usersRolesError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).create({ data });
      if (result.error) {
        set({ usersRolesError: result.error, usersRolesLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersRoles(collectionUid, { page: get().usersRolesPagination.page, pageSize: get().usersRolesPagination.pageSize });
      set({ usersRolesLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersRolesError: err.message || 'Failed to create users_role', usersRolesLoading: false });
      return { success: false, error: err.message };
    }
  },
  updateUsersRole: async (collectionUid, uid, data) => {
    try {
      set({ usersRolesLoading: true, usersRolesError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).patch({ uid }, { data });
      if (result.error) {
        set({ usersRolesError: result.error, usersRolesLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersRoles(collectionUid, { page: get().usersRolesPagination.page, pageSize: get().usersRolesPagination.pageSize });
      set({ usersRolesLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersRolesError: err.message || 'Failed to update users_role', usersRolesLoading: false });
      return { success: false, error: err.message };
    }
  },
  deleteUsersRole: async (collectionUid, uid, options = {}) => {
    try {
      set({ usersRolesLoading: true, usersRolesError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).delete({ uid }, options);
      if (result.error) {
        set({ usersRolesError: result.error, usersRolesLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersRoles(collectionUid, { page: get().usersRolesPagination.page, pageSize: get().usersRolesPagination.pageSize });
      set({ usersRolesLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersRolesError: err.message || 'Failed to delete users_role', usersRolesLoading: false });
      return { success: false, error: err.message };
    }
  },

  // Users-Permissions
  loadUsersPermissions: async (collectionUid, options = {}) => {
    const { page = 1, pageSize = 20 } = options;
    set({ usersPermissionsLoading: true, usersPermissionsError: null });
    try {
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).query({
        filter: {},
        sort: { createdAt: -1 },
        take: pageSize,
        skip: (page - 1) * pageSize
      });
      if (result.error) {
        set({ usersPermissionsError: result.error, usersPermissionsLoading: false });
        return;
      }
      set({
        usersPermissions: result.data?.list || [],
        usersPermissionsPagination: { page, pageSize, total: result.data?.total || 0 },
        usersPermissionsLoading: false,
        usersPermissionsError: null
      });
    } catch (err: any) {
      set({ usersPermissionsError: err.message || 'Failed to load users_permissions', usersPermissionsLoading: false });
    }
  },
  createUsersPermission: async (collectionUid, data) => {
    try {
      set({ usersPermissionsLoading: true, usersPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).create({ data });
      if (result.error) {
        set({ usersPermissionsError: result.error, usersPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersPermissions(collectionUid, { page: get().usersPermissionsPagination.page, pageSize: get().usersPermissionsPagination.pageSize });
      set({ usersPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersPermissionsError: err.message || 'Failed to create users_permission', usersPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },
  updateUsersPermission: async (collectionUid, uid, data) => {
    try {
      set({ usersPermissionsLoading: true, usersPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).patch({ uid }, { data });
      if (result.error) {
        set({ usersPermissionsError: result.error, usersPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersPermissions(collectionUid, { page: get().usersPermissionsPagination.page, pageSize: get().usersPermissionsPagination.pageSize });
      set({ usersPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersPermissionsError: err.message || 'Failed to update users_permission', usersPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },
  deleteUsersPermission: async (collectionUid, uid, options = {}) => {
    try {
      set({ usersPermissionsLoading: true, usersPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).delete({ uid }, options);
      if (result.error) {
        set({ usersPermissionsError: result.error, usersPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadUsersPermissions(collectionUid, { page: get().usersPermissionsPagination.page, pageSize: get().usersPermissionsPagination.pageSize });
      set({ usersPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ usersPermissionsError: err.message || 'Failed to delete users_permission', usersPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },

  // Roles-Permissions
  loadRolesPermissions: async (collectionUid, options = {}) => {
    const { page = 1, pageSize = 20 } = options;
    set({ rolesPermissionsLoading: true, rolesPermissionsError: null });
    try {
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).query({
        filter: {},
        sort: { createdAt: -1 },
        take: pageSize,
        skip: (page - 1) * pageSize
      });
      if (result.error) {
        set({ rolesPermissionsError: result.error, rolesPermissionsLoading: false });
        return;
      }
      set({
        rolesPermissions: result.data?.list || [],
        rolesPermissionsPagination: { page, pageSize, total: result.data?.total || 0 },
        rolesPermissionsLoading: false,
        rolesPermissionsError: null
      });
    } catch (err: any) {
      set({ rolesPermissionsError: err.message || 'Failed to load roles_permissions', rolesPermissionsLoading: false });
    }
  },
  createRolesPermission: async (collectionUid, data) => {
    try {
      set({ rolesPermissionsLoading: true, rolesPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).create({ data });
      if (result.error) {
        set({ rolesPermissionsError: result.error, rolesPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadRolesPermissions(collectionUid, { page: get().rolesPermissionsPagination.page, pageSize: get().rolesPermissionsPagination.pageSize });
      set({ rolesPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ rolesPermissionsError: err.message || 'Failed to create roles_permission', rolesPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },
  updateRolesPermission: async (collectionUid, uid, data) => {
    try {
      set({ rolesPermissionsLoading: true, rolesPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).patch({ uid }, { data });
      if (result.error) {
        set({ rolesPermissionsError: result.error, rolesPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadRolesPermissions(collectionUid, { page: get().rolesPermissionsPagination.page, pageSize: get().rolesPermissionsPagination.pageSize });
      set({ rolesPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ rolesPermissionsError: err.message || 'Failed to update roles_permission', rolesPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },
  deleteRolesPermission: async (collectionUid, uid, options = {}) => {
    try {
      set({ rolesPermissionsLoading: true, rolesPermissionsError: null });
      const client = getSodularClient();
      const result = await client.ref.from(collectionUid).delete({ uid }, options);
      if (result.error) {
        set({ rolesPermissionsError: result.error, rolesPermissionsLoading: false });
        return { success: false, error: result.error };
      }
      await get().loadRolesPermissions(collectionUid, { page: get().rolesPermissionsPagination.page, pageSize: get().rolesPermissionsPagination.pageSize });
      set({ rolesPermissionsLoading: false });
      return { success: true };
    } catch (err: any) {
      set({ rolesPermissionsError: err.message || 'Failed to delete roles_permission', rolesPermissionsLoading: false });
      return { success: false, error: err.message };
    }
  },

  // Utility setters
  setUsersRolesError: (error) => set({ usersRolesError: error }),
  setUsersPermissionsError: (error) => set({ usersPermissionsError: error }),
  setRolesPermissionsError: (error) => set({ rolesPermissionsError: error }),
})); 