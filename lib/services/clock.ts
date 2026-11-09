/** Source de l'heure courante, injectée pour pouvoir figer le temps dans les tests. */
export type Clock = () => Date;

/** Horloge réelle utilisée en production. */
export const systemClock: Clock = () => new Date();
