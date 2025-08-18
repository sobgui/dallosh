// Sodular Storage Library Entry Point
// Unified storage API for local and external providers (AWS, Azure, GCP, FTP)
// See docs/task/sodular_storage.txt for requirements and usage examples

// Export main service and adapters
export * from './service';
export * from './adapters';
export * from './types';
export * from './base';
// export * from './utils'; // Removed, does not exist

/**
 * Example usage:
 * import { SodularStorageService } from '@lib/storage';
 * const storage = new SodularStorageService({ type: 'local', configs: { ... } });
 * await storage.connect();
 * storage.use({ type: 'aws', configs: { ... } });
 * let { onUpload, onFinish, onError } = await storage.upload({ ... });
 * let { onDownload, onFinish, onError } = await storage.download({ ... });
 * let { value, error } = await storage.delete({ ... });
 * let { onData, onFinish, onError } = storage.readStream({ ... });
 */ 