/** Famille d'erreur métier, utilisée par les contrôleurs pour choisir la réponse. */
export type DomainErrorCode =
  'VALIDATION' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RULE_VIOLATION';

/**
 * Erreur levée par les services et les repositories lorsqu'une opération est
 * refusée. Le message est rédigé pour l'utilisateur final : il n'expose aucun
 * détail technique.
 */
export class DomainError extends Error {
  /**
   * @param code Famille de l'erreur.
   * @param message Explication destinée à l'utilisateur.
   */
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Crée une erreur de saisie invalide. */
export const validationError = (message: string) => new DomainError('VALIDATION', message);

/** Crée une erreur indiquant que l'utilisateur n'est pas connecté. */
export const unauthenticatedError = () =>
  new DomainError('UNAUTHENTICATED', 'Vous devez vous connecter pour effectuer cette action.');

/** Crée une erreur indiquant que le rôle de l'utilisateur ne suffit pas. */
export const forbiddenError = (message = 'Vous n’avez pas le droit d’effectuer cette action.') =>
  new DomainError('FORBIDDEN', message);

/** Crée une erreur indiquant qu'un élément n'existe pas ou n'est pas accessible. */
export const notFoundError = (message = 'L’élément demandé est introuvable.') =>
  new DomainError('NOT_FOUND', message);

/** Crée une erreur de conflit avec l'état actuel des données. */
export const conflictError = (message: string) => new DomainError('CONFLICT', message);

/** Crée une erreur indiquant qu'une règle de gestion est enfreinte. */
export const ruleViolationError = (message: string) => new DomainError('RULE_VIOLATION', message);
