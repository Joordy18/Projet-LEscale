import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { photoMimeTypes, type PhotoMimeType, type PhotoStorage } from '../photo-storage';

/** Préfixe des URL servies par la route `/media/[file]`. */
export const MEDIA_URL_PREFIX = '/media/';

/** Stocke les photos téléversées dans un dossier du disque. */
export class FilePhotoStorage implements PhotoStorage {
  /**
   * @param directory Dossier de destination, créé au besoin.
   */
  constructor(private readonly directory: string) {}

  async save(content: Uint8Array, mimeType: PhotoMimeType): Promise<string> {
    const fileName = `${randomUUID()}.${photoMimeTypes[mimeType]}`;

    await mkdir(this.directory, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ this.directory, fileName), content);

    return `${MEDIA_URL_PREFIX}${fileName}`;
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(MEDIA_URL_PREFIX)) {
      return;
    }

    // `path.basename` empêche toute sortie du dossier de stockage.
    const fileName = path.basename(url.slice(MEDIA_URL_PREFIX.length));

    await unlink(path.join(/* turbopackIgnore: true */ this.directory, fileName)).catch(
      () => undefined,
    );
  }

  /**
   * Retourne le chemin d'un fichier stocké, ou `null` si le nom est invalide.
   *
   * @param fileName Nom demandé dans l'URL.
   */
  resolve(fileName: string): string | null {
    return /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(fileName)
      ? path.join(/* turbopackIgnore: true */ this.directory, fileName)
      : null;
  }
}
