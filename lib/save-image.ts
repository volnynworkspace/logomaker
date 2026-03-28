import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const LOGOS_DIR = join(process.cwd(), 'public', 'logos');

/**
 * Saves an image (from a remote URL or data URL) to public/logos/ and returns
 * the local path (e.g. "/logos/abc123.png") for use in <img src="...">.
 */
export async function saveImageLocally(imageSource: string): Promise<string> {
  await mkdir(LOGOS_DIR, { recursive: true });

  const filename = `${randomUUID()}.png`;
  const filePath = join(LOGOS_DIR, filename);

  let buffer: Buffer;

  if (imageSource.startsWith('data:')) {
    // Data URL → decode base64
    const base64 = imageSource.split(',')[1];
    buffer = Buffer.from(base64, 'base64');
  } else if (imageSource.startsWith('http')) {
    // Remote URL → fetch and convert to buffer
    const response = await fetch(imageSource);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('Unsupported image source format');
  }

  await writeFile(filePath, buffer);
  return `/logos/${filename}`;
}
