/** Paramètres d'URL tels que Next.js les fournit aux pages. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Convertit les paramètres d'URL d'une page en `URLSearchParams`, en ne gardant
 * que la première valeur de chaque paramètre.
 *
 * @param raw Paramètres reçus par la page.
 */
export function toURLSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;

    if (first !== undefined) {
      params.set(key, first);
    }
  }

  return params;
}
