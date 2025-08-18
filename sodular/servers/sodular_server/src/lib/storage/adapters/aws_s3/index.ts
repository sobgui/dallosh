import { StorageAdapter } from '../../base';
import { UploadParams, DownloadParams, DeleteParams, ReadStreamParams, FilePart, FileRecord, DataCallback, FinishCallback, ErrorCallback } from '../../types';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import { Readable } from 'stream';

export class AwsS3StorageAdapter extends StorageAdapter {
  private config: any;
  private s3Client: S3Client;

  constructor(config: any) {
    super();
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      credentials: config.credentials,
    });
  }

  async upload(params: UploadParams) {
    // For AWS, upload each part in params.file (array of FilePart)
    const { bucket_id, file } = params as any;
    const parts = Array.isArray(file) ? file : [];
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('No parts to upload');
    let uploadedParts: any[] = [];
    let errors: any[] = [];
    for (const part of parts) {
      try {
        const fileStream = fs.createReadStream(part.path);
        const key = `${this.config.prefix || ''}/storage/${params.storage_id}/buckets/${bucket_id}/${part.uid}.${part.ext}`;
        const putCommand = new PutObjectCommand({
          Bucket: bucket_id,
          Key: key,
          Body: fileStream,
        });
        await this.s3Client.send(putCommand);
        uploadedParts.push({ ...part, s3Key: key });
      } catch (err) {
        errors.push({ part, error: err });
      }
    }
    return {
      onUpload: (cb: any) => {}, // Not implemented for S3 yet
      onFinish: (cb: any) => { cb({ uploadedParts, errors }); },
      onError: (cb: any) => { if (errors.length) cb(errors); },
    };
  }

  async download(params: DownloadParams) {
    // Download each part from S3 and write to location (file or stream)
    const { bucket_id, parts, location } = params as any;
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('No parts to download');
    let errors: any[] = [];
    for (const part of parts) {
      try {
        const key = `${this.config.prefix || ''}/storage/${params.storage_id}/buckets/${bucket_id}/${part.uid}.${part.ext}`;
        const getCommand = new GetObjectCommand({
          Bucket: bucket_id,
          Key: key,
        });
        const data = await this.s3Client.send(getCommand);
        if (typeof location === 'string') {
          const writeStream = fs.createWriteStream(location, { flags: 'a' });
          if (data.Body && typeof (data.Body as any).pipe === 'function' && typeof (data.Body as any).on === 'function') {
            await new Promise((resolve, reject) => {
              (data.Body as any).pipe(writeStream);
              (data.Body as any).on('end', resolve);
              (data.Body as any).on('error', reject);
            });
          } else {
            throw new Error('S3 Body is not a stream');
          }
        } else if (location && typeof location === 'object' && 'write' in location) {
          if (data.Body && typeof (data.Body as any).pipe === 'function' && typeof (data.Body as any).on === 'function') {
            await new Promise((resolve, reject) => {
              (data.Body as any).pipe(location);
              (data.Body as any).on('end', resolve);
              (data.Body as any).on('error', reject);
            });
          } else {
            throw new Error('S3 Body is not a stream');
          }
        } else {
          throw new Error('Invalid download location specified');
        }
      } catch (err) {
        errors.push({ part, error: err });
      }
    }
    return {
      onDownload: (cb: any) => {}, // Not implemented for S3 yet
      onFinish: (cb: any) => { cb({ errors }); },
      onError: (cb: any) => { if (errors.length) cb(errors); },
    };
  }

  async delete(params: DeleteParams): Promise<{ value?: FileRecord; error?: string }> {
    const { bucket_id, parts } = params as any;
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('No parts to delete');
    let deletedParts: any[] = [];
    let errors: any[] = [];
    for (const part of parts) {
      try {
        const key = `${this.config.prefix || ''}/storage/${params.storage_id}/buckets/${bucket_id}/${part.uid}.${part.ext}`;
        const delCommand = new DeleteObjectCommand({
          Bucket: bucket_id,
          Key: key,
        });
        await this.s3Client.send(delCommand);
        deletedParts.push(part);
      } catch (err) {
        errors.push({ part, error: err });
      }
    }
    return {
      value: undefined,
      error: errors.length ? JSON.stringify(errors) : undefined,
    };
  }

  readStream(params: ReadStreamParams) {
    const { bucket_id, parts } = params as any;
    let onDataCb: DataCallback | undefined;
    let onFinishCb: FinishCallback<void> | undefined;
    let onErrorCb: ErrorCallback | undefined;
    (async () => {
      try {
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const key = `${this.config.prefix || ''}/storage/${params.storage_id}/buckets/${bucket_id}/${part.uid}.${part.ext}`;
          const getCommand = new GetObjectCommand({
            Bucket: bucket_id,
            Key: key,
          });
          const data = await this.s3Client.send(getCommand);
          if (data.Body && (data.Body as Readable).on) {
            (data.Body as Readable).on('data', (chunk: Buffer) => {
              if (onDataCb) onDataCb(chunk);
            });
            await new Promise((resolve, reject) => {
              (data.Body as Readable).on('end', resolve);
              (data.Body as Readable).on('error', reject);
            });
          }
        }
        if (onFinishCb) onFinishCb();
      } catch (err: any) {
        if (onErrorCb) onErrorCb(err);
      }
    })();
    return {
      onData: (cb: DataCallback) => { onDataCb = cb; },
      onFinish: (cb: FinishCallback<void>) => { onFinishCb = cb; },
      onError: (cb: ErrorCallback) => { onErrorCb = cb; },
    };
  }
} 