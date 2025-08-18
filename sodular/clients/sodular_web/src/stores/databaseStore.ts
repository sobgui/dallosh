import { create } from 'zustand';
import { getSodularClient } from '@/services';
import { Database } from '@/lib/sodular/types/schema';

interface DatabaseState {
  // State
  databases: Database[];
  currentDatabase: Database | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };

  // Actions
  loadDatabases: (options?: { search?: string; page?: number; pageSize?: number }) => Promise<void>;
  createDatabase: (data: { name: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  updateDatabase: (uid: string, data: { name?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteDatabase: (uid: string, options?: { withSoftDelete?: boolean }) => Promise<{ success: boolean; error?: string }>;
  setCurrentDatabase: (database: Database | null) => void;
  setSearchTerm: (term: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // Initial state
  databases: [],
  currentDatabase: null,
  isLoading: false,
  error: null,
  searchTerm: '',
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },

  // Load databases with search and pagination
  loadDatabases: async (options = {}) => {
    const { search = '', page = 1, pageSize = 20 } = options;
    
    try {
      set({ isLoading: true, error: null });
      
      const client = getSodularClient();
      
      // Build filter for search
      const filter: Record<string, any> = {};
      if (search) {
        filter.$or = [
          { 'data.name': { $regex: search, $options: 'i' } },
          { 'data.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Query databases with pagination
      const result = await client.database.query({
        filter,
        select: ['uid', 'data.name', 'data.description', 'createdAt', 'updatedAt', 'isDeleted'],
        sort: { createdAt: -1 },
        take: pageSize,
        skip: (page - 1) * pageSize
      });

      if (result.error) {
        set({ error: result.error, isLoading: false });
        return;
      }

      const databases = result.data?.list || [];
      const total = result.data?.total || 0;

      set({
        databases,
        pagination: { page, pageSize, total },
        searchTerm: search,
        isLoading: false,
        error: null
      });

    } catch (err: any) {
      console.error('Failed to load databases:', err);
      set({ 
        error: err.message || 'Failed to load databases', 
        isLoading: false 
      });
    }
  },

  // Create new database
  createDatabase: async (data) => {
    try {
      set({ isLoading: true, error: null });
      
      const client = getSodularClient();
      const result = await client.database.create({
        data: {
          name: data.name,
          description: data.description || ''
        }
      });

      if (result.error) {
        set({ error: result.error, isLoading: false });
        return { success: false, error: result.error };
      }

      // Reload databases to show the new one
      await get().loadDatabases({ 
        search: get().searchTerm, 
        page: get().pagination.page,
        pageSize: get().pagination.pageSize 
      });

      set({ isLoading: false });
      return { success: true };

    } catch (err: any) {
      console.error('Failed to create database:', err);
      const error = err.message || 'Failed to create database';
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  // Update database
  updateDatabase: async (uid, data) => {
    try {
      set({ isLoading: true, error: null });
      
      const client = getSodularClient();
      const result = await client.database.patch(
        { uid },
        { data }
      );

      if (result.error) {
        set({ error: result.error, isLoading: false });
        return { success: false, error: result.error };
      }

      // Reload databases to show updated data
      await get().loadDatabases({ 
        search: get().searchTerm, 
        page: get().pagination.page,
        pageSize: get().pagination.pageSize 
      });

      set({ isLoading: false });
      return { success: true };

    } catch (err: any) {
      console.error('Failed to update database:', err);
      const error = err.message || 'Failed to update database';
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  // Delete database
  deleteDatabase: async (uid, options = {}) => {
    try {
      set({ isLoading: true, error: null });
      
      const client = getSodularClient();
      const result = await client.database.delete(
        { uid },
        options
      );

      if (result.error) {
        set({ error: result.error, isLoading: false });
        return { success: false, error: result.error };
      }

      // Reload databases to reflect deletion
      await get().loadDatabases({ 
        search: get().searchTerm, 
        page: get().pagination.page,
        pageSize: get().pagination.pageSize 
      });

      set({ isLoading: false });
      return { success: true };

    } catch (err: any) {
      console.error('Failed to delete database:', err);
      const error = err.message || 'Failed to delete database';
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  // Utility setters
  setCurrentDatabase: (database) => set({ currentDatabase: database }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearError: () => set({ error: null }),
}));
