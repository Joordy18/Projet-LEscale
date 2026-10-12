import { readFile } from 'node:fs/promises';
import { getServices } from '@/lib/services';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** `GET /media/[file]` : sert une photo de ressource téléversée par un gestionnaire. */
export async function GET(_request: Request, context: RouteContext<'/media/[file]'>) {
  const { file } = await context.params;
  const path = getServices().photos.resolve(file);

  if (!path) {
    return new Response('Introuvable', { status: 404 });
  }

  try {
    const content = await readFile(path);

    return new Response(content, {
      headers: {
        'Content-Type': contentTypes[file.split('.').pop() ?? ''] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Le navigateur ne doit jamais interpréter ce fichier autrement que comme une image.
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}
