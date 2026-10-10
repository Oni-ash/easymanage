import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join, normalize } from 'path';
import { randomBytes } from 'crypto';

const ROOT = join(process.cwd(), 'uploads');

function safePath(key: string): string {
  const p = normalize(join(ROOT, key));
  if (!p.startsWith(ROOT)) throw new Error('Invalid storage key');
  return p;
}

export async function saveFile(
  originalName: string,
  buffer: Buffer,
): Promise<{ key: string; size: number }> {
  await mkdir(ROOT, { recursive: true });
  const ext = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.'))
    : '';
  const key = `${randomBytes(16).toString('hex')}${ext}`;
  await writeFile(safePath(key), buffer);
  return { key, size: buffer.length };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(safePath(key));
}

export async function deleteStoredFile(key: string): Promise<void> {
  try {
    await unlink(safePath(key));
  } catch {
    // already gone
  }
}