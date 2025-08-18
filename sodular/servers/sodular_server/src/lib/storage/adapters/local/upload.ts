import { UploadParams, FileRecord, FilePart, UploadProgressCallback, FinishCallback, ErrorCallback } from '../../types';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/core/utils';
import busboy from 'busboy';
import { joinPath } from '@/lib/storage/utils';
import { resolve } from 'path';

// Helper to ensure directory exists
async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

export class LocalUploadHandler {
  private config: any;
  private chunkSize: number;

  constructor(config: any, chunkSize: number = 50 * 1024 * 1024) {
    this.config = config;
    this.chunkSize = chunkSize;
  }

  async upload(params: UploadParams): Promise<{
    onUpload: (cb: UploadProgressCallback) => void;
    onFinish: (cb: FinishCallback<FileRecord>) => void;
    onError: (cb: ErrorCallback) => void;
  }> {
    const { storage_id, bucket_id, file } = params;
    Logger.debug('[LocalUploadHandler] upload called', { storage_id, bucket_id, fileType: typeof file });
    Logger.debug('[LocalUploadHandler] RAW config.prefix', { rawPrefix: this.config.prefix });
    let localStoragePath = this.config.localStoragePath || 'storage';
    // Force absolute path
    if (!path.isAbsolute(localStoragePath)) {
      localStoragePath = resolve(process.cwd(), localStoragePath);
    }
    let prefix = this.config.prefix ? this.config.prefix : undefined;
    let prefixParts: string[] = [];
    if (prefix && typeof prefix === 'string') {
      prefix = prefix.replace(/^([\/\\])+/g, '').replace(/\\/g, '/');
      prefixParts = prefix.split('/').filter(Boolean);
    }
    // Ensure prefixParts is not empty if prefix is set
    if (prefix && prefixParts.length === 0) {
      prefixParts = [prefix];
    }
    if (!storage_id) throw new Error('storage_id is required for physical path');
    Logger.debug('[LocalUploadHandler] PATH SEGMENTS', { localStoragePath, prefixParts, storage_id, bucket_id });
    const baseDir = path.join(
      localStoragePath,
      ...(prefixParts.length > 0 ? prefixParts : []),
      'storage',
      storage_id,
      'buckets',
      bucket_id
    );
    await ensureDir(baseDir);
    // Compose the logical (db) path using joinPath (always forward slashes)
    const logicalBaseDir = joinPath(
      ...(prefix ? [prefix] : []),
      'storage',
      storage_id,
      'buckets',
      bucket_id
    );
    Logger.debug('[LocalUploadHandler] Using prefix and baseDir', { prefix, baseDir });

    // Determine file source type
    let fileStream: fs.ReadStream | NodeJS.ReadableStream | undefined;
    let fileName = 'uploaded-file';
    let fileSize = 0;
    let ext = 'bin';
    let type = 'application/octet-stream';
    let fileBuffer: Buffer | undefined;

    // Handle Express request (streaming, no buffering)
    if (file && typeof file.pipe === 'function' && file.headers && file.method) {
      // file is an Express request
      return this.uploadFromExpressRequest(file, baseDir, bucket_id);
    }

    if (typeof file === 'string') {
      fileStream = fs.createReadStream(file);
      fileName = path.basename(file);
      const stat = await fs.promises.stat(file);
      fileSize = stat.size;
      ext = path.extname(fileName).replace('.', '') || 'bin';
    } else if (file instanceof Buffer) {
      fileBuffer = file;
      fileSize = file.length;
    } else if (file && typeof file.pipe === 'function' && file.readable !== false) {
      // ReadableStream (not Buffer)
      fileStream = file;
      if (file.originalname) fileName = file.originalname;
      if (file.mimetype) type = file.mimetype;
      ext = path.extname(fileName).replace('.', '') || 'bin';
    } else if (file && typeof file === 'object') {
      // Express file upload: req.file or req.files
      if (file.buffer && file.originalname) {
        // Multer single file: req.file
        fileBuffer = file.buffer;
        fileName = file.originalname;
        fileSize = file.size || file.buffer.length;
        ext = path.extname(fileName).replace('.', '') || 'bin';
        type = file.mimetype || type;
      } else if (Array.isArray(file)) {
        // Multer array: req.files
        // Only handle the first file for now
        const f = file[0];
        if (f && f.buffer && f.originalname) {
          fileBuffer = f.buffer;
          fileName = f.originalname;
          fileSize = f.size || f.buffer.length;
          ext = path.extname(fileName).replace('.', '') || 'bin';
          type = f.mimetype || type;
        }
      } else if (file.path && file.originalname) {
        // Multer disk storage
        fileStream = fs.createReadStream(file.path);
        fileName = file.originalname;
        const stat = await fs.promises.stat(file.path);
        fileSize = stat.size;
        ext = path.extname(fileName).replace('.', '') || 'bin';
        type = file.mimetype || type;
      }
    }

    // Prepare part info
    const parts: FilePart[] = [];
    const file_id = uuidv4();
    let uploadedBytes = 0;
    let partIndex = 0;
    let finished = false;
    let errored = false;
    let onUploadCb: UploadProgressCallback | undefined;
    let onFinishCb: FinishCallback<FileRecord> | undefined;
    let onErrorCb: ErrorCallback | undefined;

    // Helper to emit progress
    function emitProgress() {
      if (onUploadCb) {
        const percentage = fileSize ? Math.round((uploadedBytes / fileSize) * 100) : 0;
        onUploadCb({}, partIndex + 1, 1, uploadedBytes, percentage);
      }
    }

    // Helper to emit finish
    function emitFinish(record: FileRecord) {
      finished = true;
      if (onFinishCb) onFinishCb(record);
    }

    // Helper to emit error
    function emitError(err: Error) {
      errored = true;
      if (onErrorCb) onErrorCb(err);
    }

    // Main upload logic
    (async () => {
      try {
        Logger.debug('[LocalUploadHandler] Starting upload logic', { fileBuffer: !!fileBuffer, fileStream: !!fileStream });
        // Build the correct physical path
        let partPath = path.join(
          baseDir,
          `${file_id}.${ext}`
        );
        Logger.debug('[LocalUploadHandler] FINAL physical partPath', { partPath });
        let logicalPartPath = joinPath(logicalBaseDir, `${file_id}.${ext}`);
        let writeStream = fs.createWriteStream(partPath);
        if (fileBuffer) {
          Logger.debug('[LocalUploadHandler] Writing fileBuffer', { length: fileBuffer.length });
          writeStream.write(fileBuffer);
          uploadedBytes = fileBuffer.length;
          emitProgress();
          writeStream.end();
        } else if (fileStream) {
          Logger.debug('[LocalUploadHandler] Piping fileStream');
          (fileStream as NodeJS.ReadableStream).on('data', (chunk: Buffer) => {
            uploadedBytes += chunk.length;
            emitProgress();
            Logger.debug('[LocalUploadHandler] Received data chunk', { chunkLength: chunk.length, uploadedBytes });
          });
          (fileStream as NodeJS.ReadableStream).on('end', () => {
            Logger.debug('[LocalUploadHandler] fileStream end event');
          });
          (fileStream as NodeJS.ReadableStream).on('close', () => {
            Logger.debug('[LocalUploadHandler] fileStream close event');
          });
          (fileStream as NodeJS.ReadableStream).on('error', (err) => {
            Logger.error('[LocalUploadHandler] fileStream error', err);
          });
          writeStream.on('finish', () => {
            Logger.debug('[LocalUploadHandler] writeStream finish event');
          });
          writeStream.on('close', () => {
            Logger.debug('[LocalUploadHandler] writeStream close event');
          });
          writeStream.on('error', (err) => {
            Logger.error('[LocalUploadHandler] writeStream error', err);
          });
          await pipeline(fileStream, writeStream);
        } else {
          Logger.error('[LocalUploadHandler] Unsupported file input type', { file });
          throw new Error('Unsupported file input type');
        }
        parts.push({
          uid: file_id,
          ext,
          order: 0,
          size: uploadedBytes,
          path: logicalPartPath,
          length: uploadedBytes,
        });
        // Compose file record
        const fileRecord: FileRecord = {
          uid: file_id,
          data: {
            bucket_id,
            filename: fileName,
            length: uploadedBytes,
            parts,
            path: logicalPartPath,
            size: uploadedBytes,
            ext,
            type,
            downloadUrl: '', // To be filled by service
          },
        };
        Logger.debug('[LocalUploadHandler] emitFinish called', { fileRecord });
        emitFinish(fileRecord);
      } catch (err: any) {
        Logger.error('[LocalUploadHandler] upload error', err);
        emitError(err);
      }
    })();

    // Return event/callback interface
    const eventInterface = {
      onUpload: (cb: UploadProgressCallback) => { onUploadCb = cb; },
      onFinish: (cb: FinishCallback<FileRecord>) => { onFinishCb = cb; },
      onError: (cb: ErrorCallback) => { onErrorCb = cb; },
    };
    return eventInterface;
  }

  async uploadFromExpressRequest(req: any, baseDir: string, bucket_id: string): Promise<{
    onUpload: (cb: UploadProgressCallback) => void;
    onFinish: (cb: FinishCallback<FileRecord>) => void;
    onError: (cb: ErrorCallback) => void;
  }> {
    let onUploadCb: UploadProgressCallback | undefined;
    let onFinishCb: FinishCallback<FileRecord> | undefined;
    let onErrorCb: ErrorCallback | undefined;
    let finished = false;
    let errored = false;
    let fileInfo: FileRecord | null = null;
    let errorInfo: Error | null = null;
    let writeStream: fs.WriteStream | null = null;
    let fileDone = false;
    let busboyDone = false;
    let uploadedBytes = 0;
    let file_id = uuidv4();
    let fileName = 'uploaded-file';
    let ext = 'bin';
    let type = 'application/octet-stream';
    const parts: FilePart[] = [];
    Logger.debug('[LocalUploadHandler] RAW config.prefix', { rawPrefix: this.config.prefix });
    // Extract storage_id and bucket_id from req (query, body, or fields)
    const storage_id = req.query?.storage_id || req.body?.storage_id || req.fields?.storage_id;
    const extractedBucketId = req.query?.bucket_id || req.body?.bucket_id || req.fields?.bucket_id || bucket_id;
    let localStoragePath2 = this.config.localStoragePath || 'storage';
    if (!path.isAbsolute(localStoragePath2)) {
      localStoragePath2 = resolve(process.cwd(), localStoragePath2);
    }
    let prefix2 = this.config.prefix ? this.config.prefix : undefined;
    let prefixParts2: string[] = [];
    if (prefix2 && typeof prefix2 === 'string') {
      prefix2 = prefix2.replace(/^([\/\\])+/g, '').replace(/\\/g, '/');
      prefixParts2 = prefix2.split('/').filter(Boolean);
    }
    if (prefix2 && prefixParts2.length === 0) {
      prefixParts2 = [prefix2];
    }
    if (!storage_id) throw new Error('storage_id is required for physical path');
    Logger.debug('[LocalUploadHandler] PATH SEGMENTS (Express)', { localStoragePath2, prefixParts2, storage_id, bucket_id: extractedBucketId });
    baseDir = path.join(
      localStoragePath2,
      ...(prefixParts2.length > 0 ? prefixParts2 : []),
      'storage',
      storage_id,
      'buckets',
      extractedBucketId
    );
    await ensureDir(baseDir);
    // Compose the logical (db) path using joinPath (always forward slashes)
    const logicalBaseDir = joinPath(
      ...(prefix2 ? [prefix2] : []),
      'storage',
      storage_id,
      'buckets',
      extractedBucketId
    );

    return new Promise((resolve, reject) => {
      function emitProgress() {
        if (onUploadCb) {
          const percentage = uploadedBytes ? Math.round((uploadedBytes / (uploadedBytes + 1)) * 100) : 0;
          onUploadCb({}, 1, 1, uploadedBytes, percentage);
        }
      }
      function maybeFinish() {
        if (fileDone && busboyDone && !finished && fileInfo) {
          finished = true;
          if (onFinishCb) onFinishCb(fileInfo);
          resolve(eventInterface);
        }
      }
      function emitError(err: Error) {
        errored = true;
        errorInfo = err;
        if (onErrorCb) onErrorCb(err);
        reject(err);
      }
      const eventInterface = {
        onUpload: (cb: UploadProgressCallback) => { onUploadCb = cb; },
        onFinish: (cb: FinishCallback<FileRecord>) => {
          onFinishCb = cb;
          if (finished && fileInfo) cb(fileInfo);
        },
        onError: (cb: ErrorCallback) => {
          onErrorCb = cb;
          if (errored && errorInfo) cb(errorInfo);
        },
      };
      const bb = busboy({ headers: req.headers });

      bb.on('file', (name: any, stream: any, info: any) => {
        fileName = info.filename;
        ext = path.extname(fileName).replace('.', '') || 'bin';
        type = info.mimeType || type;
        file_id = uuidv4();
        const partPath = path.join(
          baseDir,
          `${file_id}.${ext}`
        );
        Logger.debug('[LocalUploadHandler] FINAL physical partPath', { partPath });
        const logicalPartPath = joinPath(logicalBaseDir, `${file_id}.${ext}`);
        writeStream = fs.createWriteStream(partPath);
        stream.on('data', (chunk: Buffer) => {
          uploadedBytes += chunk.length;
          emitProgress();
        });
        stream.on('end', () => {
          parts.push({
            uid: file_id,
            ext,
            order: 0,
            size: uploadedBytes,
            path: logicalPartPath,
            length: uploadedBytes,
          });
          fileInfo = {
            uid: file_id,
            data: {
              bucket_id,
              filename: fileName,
              length: uploadedBytes,
              parts,
              path: logicalPartPath,
              size: uploadedBytes,
              ext,
              type,
              downloadUrl: '',
            },
          };
          fileDone = true;
          maybeFinish();
        });
        stream.on('error', (err: any) => {
          emitError(err);
        });
        writeStream.on('finish', () => {
          fileDone = true;
          maybeFinish();
        });
        writeStream.on('error', (err: any) => {
          emitError(err);
        });
        stream.pipe(writeStream);
      });
      bb.on('error', (err: any) => {
        emitError(err as Error);
      });
      bb.on('finish', () => {
        busboyDone = true;
        maybeFinish();
      });
      req.pipe(bb);
    });
  }
} 