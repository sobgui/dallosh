// Schemas Schema - Describes the structure of other collections
export interface Schema {
  uid: string;
  data: {
    name: string;
    description?: string;
    collection_id: string;
    schema: Record<string, any>;
    methods: {
      post?: { input: string[] };
      put?: { input: string[] };
      patch?: { input: string[] };
      get?: { response: { allow: string[]; except: string[] } };
    };
    isDefault: boolean;
  };
  createdAt: number;
  updatedAt?: number;
  createdBy: string | 'system';
  updatedBy: string | 'system';
} 