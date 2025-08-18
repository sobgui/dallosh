import { StorageAdapter } from './base';
import { UploadParams, DownloadParams, DeleteParams, ReadStreamParams, FileRecord } from './types';
import { LocalStorageAdapter } from './adapters/local';
import { AwsS3StorageAdapter } from './adapters/aws_s3';
// import { AwsStorageAdapter } from './adapters/aws';
// import { AzureStorageAdapter } from './adapters/azure';
// import { GcpStorageAdapter } from './adapters/gcp';
// import { FtpStorageAdapter } from './adapters/ftp';

export class SodularStorageService {
  private adapter: StorageAdapter;
  private config: any;

  constructor(config?: any) {
    this.config = config;
    // Always use config.configs if present (for correct prefix/localStoragePath)
    const { localStoragePath, prefix, chunkFileSize } = (config && config.configs) ? config.configs : (config || {});
    this.adapter = new LocalStorageAdapter({ localStoragePath, prefix, chunkFileSize });
  }

  /**
   * Connect to the storage service (for API contract)
   */
  async connect(): Promise<{ isReady: boolean; error: any; storage: SodularStorageService }> {
    // For local, always ready; for remote, could add real connection logic
    return { isReady: true, error: null, storage: this };
  }

  /**
   * Switch to a different storage adapter (local, aws, azure, gcp, ftp)
   */
  use({ type, configs }: { type: string; configs: any }) {
    if (type === 'local') {
      // Only pass serializable config fields to the adapter
      const { localStoragePath, prefix, chunkFileSize } = configs || {};
      this.adapter = new LocalStorageAdapter({ localStoragePath, prefix, chunkFileSize });
    } else if (type === 'aws') {
      const { localStoragePath, prefix, chunkFileSize, accessKeyId, secretAccessKey, region, bucket } = { ...this.config, ...configs };
      const awsAdapter = new AwsS3StorageAdapter({ localStoragePath, prefix, chunkFileSize, accessKeyId, secretAccessKey, region, bucket });
      const origDelete = awsAdapter.delete.bind(awsAdapter);
      awsAdapter.delete = async (params) => {
        const result = await origDelete(params);
        return { value: undefined, error: result.error };
      };
      this.adapter = awsAdapter;
    }
    // else if (type === 'aws') this.adapter = new AwsStorageAdapter(configs);
    // else if (type === 'azure') this.adapter = new AzureStorageAdapter(configs);
    // else if (type === 'gcp') this.adapter = new GcpStorageAdapter(configs);
    // else if (type === 'ftp') this.adapter = new FtpStorageAdapter(configs);
    else {
      throw new Error('Unsupported storage type: ' + type);
    }
  }

  /**
   * Upload a file (see UploadParams)
   */
  async upload(params: UploadParams) {
    return this.adapter.upload(params);
  }

  /**
   * Download a file (see DownloadParams)
   */
  async download(params: DownloadParams) {
    // Fetch the FileRecord from the DB using params
    if (!params || !params.storage_id || !params.bucket_id || !params.file_id) {
      throw new Error('Missing required params for download');
    }
    if (!this.config || !this.config.database) {
      throw new Error('Database instance required in storage service config');
    }
    const database = this.config.database;
    const filesTableResult = await database.tables.get({ filter: { 'data.name': 'files' } });
    if (!filesTableResult.value) throw new Error('Files table not found');
    const fileResult = await database.ref.from(filesTableResult.value.uid).get({ filter: { uid: params.file_id } });
    if (!fileResult.value) {
      throw new Error('FileRecord not found for given file_id');
    }
    const fileRecord = fileResult.value;
    // Only pass file-system params to the adapter
    return this.adapter.download(params, fileRecord);
  }

  /**
   * Delete a file or parts (see DeleteParams)
   */
  async delete(params: DeleteParams) {
    // Fetch the FileRecord from the DB using params
    if (!params || !params.storage_id || !params.bucket_id || !params.parts || params.parts.length === 0) {
      throw new Error('Missing required params for delete');
    }
    if (!this.config || !this.config.database) {
      throw new Error('Database instance required in storage service config');
    }
    const database = this.config.database;
    const filesTableResult = await database.tables.get({ filter: { 'data.name': 'files' } });
    if (!filesTableResult.value) throw new Error('Files table not found');
    // Find the file record by part uid
    const partUid = params.parts[0].uid;
    const fileResult = await database.ref.from(filesTableResult.value.uid).query({ filter: { 'data.parts.uid': partUid } });
    if (!fileResult.value || !fileResult.value.list || fileResult.value.list.length === 0) {
      throw new Error('FileRecord not found for given part uid');
    }
    // Only pass file-system params to the adapter
    return this.adapter.delete(params);
  }

  /**
   * Read a file as a stream (see ReadStreamParams)
   */
  readStream(params: ReadStreamParams) {
    return this.adapter.readStream(params);
  }

  /**
   * Expose the current adapter for database injection
   */
  get currentAdapter() {
    return this.adapter;
  }
} 