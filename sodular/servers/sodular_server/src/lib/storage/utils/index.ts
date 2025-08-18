// Storage library utilities
// Add shared helpers here for adapters and core logic

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

// Example: chunk a buffer into parts of a given size
export function chunkBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize));
  }
  return chunks;
} 