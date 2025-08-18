import { BaseClient } from '../base-client';
import {
  ApiResponse,
  QueryOptions,
  QueryResult,
  CountResult,
  UpdateResult,
  DeleteResult,
  DeleteOptions,
  Ref,
  CreateRefRequest,
  UpdateRefRequest
} from '../../types/schema';

export class RefAPI {
  private currentTableId?: string;
  private currentDatabaseId?: string;

  constructor(private client: BaseClient) {}

  from(tableId: string): this {
    this.currentTableId = tableId;
    // Get current database ID from client
    this.currentDatabaseId = (this.client as any).currentDatabaseId;
    return this;
  }

  /**
   * Listen to events for the current table
   * @param event - Event name: 'created', 'replaced', 'patched', 'deleted'
   * @param callback - Callback function to handle the event
   */
  on(event: 'created' | 'replaced' | 'patched' | 'deleted', callback: (data: any) => void): this {
    if (!this.currentTableId) {
      throw new Error('Table ID is required. Use from(tableId) first.');
    }

    // Join the channel for this table
    this.client.joinChannel(this.currentDatabaseId, this.currentTableId);
    
    // Listen to the specific event
    this.client.on(event, callback);
    
    return this;
  }

  /**
   * Stop listening to events for the current table
   */
  off(event?: 'created' | 'replaced' | 'patched' | 'deleted'): this {
    if (!this.currentTableId) {
      throw new Error('Table ID is required. Use from(tableId) first.');
    }

    if (event) {
      this.client.off(event);
    } else {
      // Remove all event listeners
      this.client.off('created');
      this.client.off('replaced');
      this.client.off('patched');
      this.client.off('deleted');
    }

    // Leave the channel
    this.client.leaveChannel(this.currentDatabaseId, this.currentTableId);
    
    return this;
  }

  private checkTableId() {
    if (!this.currentTableId) {
      throw new Error('Table ID is required. Use from(tableId) first.');
    }
  }

  async create(data: CreateRefRequest): Promise<ApiResponse<Ref>> {
    this.checkTableId();
    return this.client.request<Ref>('POST', '/ref', {
      params: { table_id: this.currentTableId },
      data
    });
  }

  async get(options: { filter: Record<string, any>; select?: string[] }): Promise<ApiResponse<Ref>> {
    this.checkTableId();
    return this.client.request<Ref>('GET', '/ref', { params: { ...options, table_id: this.currentTableId } });
  }

  async query(options: QueryOptions): Promise<ApiResponse<QueryResult<Ref>>> {
    this.checkTableId();
    return this.client.request<QueryResult<Ref>>('GET', '/ref/query', { params: { ...options, table_id: this.currentTableId } });
  }

  async count(options: { filter?: Record<string, any> }): Promise<ApiResponse<CountResult>> {
    this.checkTableId();
    return this.client.request<CountResult>('GET', '/ref/count', { params: { ...options, table_id: this.currentTableId } });
  }

  async put(filter: Record<string, any>, data: UpdateRefRequest): Promise<ApiResponse<UpdateResult>> {
    this.checkTableId();
    return this.client.request<UpdateResult>('PUT', '/ref', { params: { filter, table_id: this.currentTableId }, data });
  }

  async patch(filter: Record<string, any>, data: UpdateRefRequest): Promise<ApiResponse<UpdateResult>> {
    this.checkTableId();
    return this.client.request<UpdateResult>('PATCH', '/ref', { params: { filter, table_id: this.currentTableId }, data });
  }

  async delete(filter: Record<string, any>, options?: DeleteOptions): Promise<ApiResponse<DeleteResult>> {
    this.checkTableId();
    return this.client.request<DeleteResult>('DELETE', '/ref', { params: { filter, options, table_id: this.currentTableId } });
  }
}
