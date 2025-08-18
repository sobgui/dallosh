import { DeleteParams, FileRecord } from '../../types';
import * as fs from 'fs';
import { Logger } from '@/core/utils';
import * as path from 'path';

export class LocalDeleteHandler {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  // Helper to recursively remove empty parent directories up to a root
  private async removeEmptyDirs(dir: string, stopAt: string) {
    let current = dir;
    while (current && current !== stopAt && current.startsWith(stopAt)) {
      try {
        const files = await fs.promises.readdir(current);
        if (files.length === 0) {
          await fs.promises.rmdir(current);
          current = path.dirname(current);
        } else {
          break;
        }
      } catch (err) {
        break;
      }
    }
  }

  async delete(params: DeleteParams) {
    const { parts } = params;
    if (!parts || parts.length === 0) {
      throw new Error('No parts provided for deletion');
    }
    let deletedParts: any[] = [];
    let errors: string[] = [];
    // Determine the storage root for stopping directory cleanup
    const storageRoot = this.config && this.config.localStoragePath ? this.config.localStoragePath : process.cwd();
    for (const part of parts) {
      try {
        await fs.promises.unlink(this.config.localStoragePath+'/'+part.path);
        deletedParts.push(part);
        // Recursively remove empty parent directories up to storageRoot
        await this.removeEmptyDirs(path.dirname(part.path), storageRoot);
      } catch (err: any) {
        errors.push(`Failed to delete ${part.path}: ${err.message}`);
        Logger.error('LocalDeleteHandler.delete error', { path: part.path, error: err });
      }
    }
    return {
      value: { deletedParts },
      error: errors.length ? errors : undefined,
    };
  }
} 