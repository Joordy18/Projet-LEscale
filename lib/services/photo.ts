import { validationError } from '@/lib/domain/errors';
import { MAX_PHOTO_BYTES, type PhotoMimeType } from '@/lib/repositories/photo-storage';

/** Photo envoyée par un gestionnaire. */
export type PhotoUpload = { content: Uint8Array; declaredType: string };

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * Reconnaît le type d'une image d'après son contenu et non d'après son nom ou
 * le type annoncé par le navigateur, qui peuvent être falsifiés.
 *
 * @param bytes Contenu du fichier.
 * @returns Le type d'image, ou `null` si le format n'est pas accepté.
 */
export function detectImageType(bytes: Uint8Array): PhotoMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Contrôle une photo avant son enregistrement.
 *
 * @param upload Fichier envoyé.
 * @returns Le type d'image reconnu.
 * @throws DomainError `VALIDATION` si le fichier est vide, trop lourd ou n'est pas une image JPEG, PNG ou WebP.
 */
export function validatePhoto(upload: PhotoUpload): PhotoMimeType {
  if (upload.content.byteLength === 0) {
    throw validationError('Le fichier de la photo est vide.');
  }

  if (upload.content.byteLength > MAX_PHOTO_BYTES) {
    throw validationError('La photo ne doit pas dépasser 2 Mo.');
  }

  const type = detectImageType(upload.content);

  if (!type) {
    throw validationError('La photo doit être une image JPEG, PNG ou WebP.');
  }

  return type;
}
