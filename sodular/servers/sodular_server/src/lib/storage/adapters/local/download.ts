import { DownloadParams, FileRecord, FilePart, DownloadProgressCallback, FinishCallback, ErrorCallback } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Logger } from '@/core/utils';

export class LocalDownloadHandler {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  // NOTE: LocalDownloadHandler.download is an internal method only. Do not export or use as a public API.
  // Only LocalStorageAdapter.download is public and matches the unified API.
  async download(params: DownloadParams, fileRecord: FileRecord) {
    const { parts, location, range } = params;
    let onDownloadCb: DownloadProgressCallback | undefined;
    let onFinishCb: FinishCallback<void> | undefined;
    let onErrorCb: ErrorCallback | undefined;
    let downloadedBytes = 0;
    let totalBytes = 0;
    let allParts: FilePart[] = parts && parts.length > 0 ? parts : fileRecord.data.parts;
    allParts = allParts.map(part => ({
      ...part,
      // Reconstruct the physical path for fs access (do NOT prepend prefix again)
      path: path.join(
        this.config.localStoragePath || 'storage',
        ...part.path.split('/')
      )
    }));
    allParts.sort((a, b) => a.order - b.order);
    totalBytes = allParts.reduce((sum, p) => sum + p.length, 0);

    function emitProgress(index: number) {
      if (onDownloadCb) {
        const percentage = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        onDownloadCb({ fileInfo: fileRecord, index, total: allParts.length, size: downloadedBytes, percentage });
      }
    }
    function emitFinish() { if (onFinishCb) onFinishCb(); }
    function emitError(err: Error) { if (onErrorCb) onErrorCb(err); }

    (async () => {
      try {
        if (typeof location === 'string') {
          // Download to file path
          const writeStream = fs.createWriteStream(location);
          for (let i = 0; i < allParts.length; i++) {
            const part = allParts[i];
            Logger.debug('[LocalDownloadHandler] Downloading part to file', { partPath: part.path, dest: location });
            const readStream = fs.createReadStream(part.path);
            readStream.on('data', (chunk: string | Buffer) => {
              const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              downloadedBytes += bufferChunk.length;
              emitProgress(i + 1);
            });
            await pipeline(readStream, writeStream, { end: i === allParts.length - 1 });
          }
          writeStream.end();
        } else if (location && typeof location === 'object' && typeof location.setHeader === 'function') {
          // Download to Express response
          location.setHeader('Content-Type', fileRecord.data.type || 'application/octet-stream');
          location.setHeader('Content-Disposition', `attachment; filename=\"${fileRecord.data.filename || 'file'}\"`);
          location.setHeader('Content-Length', totalBytes);
          for (let i = 0; i < allParts.length; i++) {
            const part = allParts[i];
            Logger.debug('[LocalDownloadHandler] Downloading part to response', { partPath: part.path });
            const readStream = fs.createReadStream(part.path);
            readStream.on('data', (chunk: string | Buffer) => {
              const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              downloadedBytes += bufferChunk.length;
              emitProgress(i + 1);
            });
            await pipeline(readStream, location, { end: i === allParts.length - 1 });
          }
        } else {
          Logger.error('[LocalDownloadHandler] Invalid download location', { locationType: typeof location });
          throw new Error('Invalid download location specified');
        }
        emitFinish();
      } catch (err: any) {
        Logger.error('[LocalDownloadHandler] Download error', err);
        emitError(err);
      }
    })();

    return {
      onDownload: (cb: DownloadProgressCallback) => { onDownloadCb = cb; },
      onFinish: (cb: FinishCallback<void>) => { onFinishCb = cb; },
      onError: (cb: ErrorCallback) => { onErrorCb = cb; },
    };
  }
} 