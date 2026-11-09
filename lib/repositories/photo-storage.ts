/** Types d'image acceptés pour la photo d'une ressource, avec leur extension. */
export const photoMimeTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type PhotoMimeType = keyof typeof photoMimeTypes;

/** Taille maximale d'une photo, en octets. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Contrat de stockage des photos de ressources. */
export interface PhotoStorage {
  /**
   * Enregistre une photo et retourne l'URL relative à utiliser pour l'afficher.
   *
   * @param content Contenu de l'image.
   * @param mimeType Type de l'image, déjà contrôlé.
   */
  save(content: Uint8Array, mimeType: PhotoMimeType): Promise<string>;
  /** Supprime une photo précédemment enregistrée ; sans effet si elle n'existe pas. */
  remove(url: string): Promise<void>;
}
