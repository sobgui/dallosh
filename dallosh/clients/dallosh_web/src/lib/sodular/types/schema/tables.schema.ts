// Tables Schema - Must match backend exactly
export interface TableData {
  name: string;
  description?: string;
  [key: string]: any;
}

export interface Table {
  uid: string;
  data: TableData;
  createdAt: number;
  createdBy: string | 'system';
  updatedAt: number;
  updatedBy: string | 'system';
  deletedAt?: number;
  isDeleted?: boolean;
  deletedBy?: string | 'system';
  lockedAt?: number;
  isLocked?: boolean;
  lockedBy?: string | 'system';
}

export interface CreateTableRequest {
  uid?: string;
  data: TableData;
  createdBy?: string;
}

export interface UpdateTableRequest {
  uid?: string;
  data?: Partial<TableData>;
  updatedBy?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  deletedBy?: string | 'system';
  isLocked?: boolean;
  lockedBy?: string | 'system';
}
