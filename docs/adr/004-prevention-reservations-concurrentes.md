# ADR 004 — Prévention des réservations concurrentes

## Contexte

Deux utilisateurs peuvent soumettre presque simultanément une réservation pour
la même ressource et un créneau qui se chevauche. Une simple vérification
préalable dans le service métier n'est pas suffisante : les deux requêtes
pourraient lire le même état disponible avant d'être enregistrées.

L'application doit empêcher la création de deux réservations incompatibles,
tout en prenant en compte les demandes en attente et les réservations
confirmées selon les règles métier.

## Décision

La disponibilité est contrôlée dans une transaction PostgreSQL au moment de la
création ou de la validation d'une réservation.

Le service de réservation :

1. valide les données et les règles métier ;
2. démarre une transaction ;
3. vérifie les chevauchements avec les lignes concernées ;
4. crée ou met à jour la réservation dans la transaction ;
5. valide la transaction ou retourne un refus explicite en cas de conflit.

Une contrainte d'exclusion PostgreSQL sur la ressource et l'intervalle de
temps empêchera les chevauchements entre les réservations actives. Elle
utilisera une clause équivalente à :

```sql
WHERE (status IN ('PENDING', 'CONFIRMED'))
```

Les réservations `CANCELLED`, `REJECTED` et `EXPIRED` ne bloquent donc plus la
disponibilité. La contrainte sera ajoutée dans une migration SQL Prisma, car
elle n'est pas entièrement exprimable dans le schéma Prisma. Cette migration
activera également l'extension PostgreSQL `btree_gist`, nécessaire pour
combiner l'identifiant de ressource et l'intervalle temporel.

La vérification applicative prendra aussi en compte les périodes de
maintenance de la ressource. Une maintenance qui chevauche le créneau demandé
entraîne un refus ou l'annulation des réservations concernées selon la règle
métier applicable.

## Raisons du choix

- PostgreSQL est la source de vérité des réservations ;
- la décision est prise au plus près de l'écriture concurrente ;
- une transaction permet d'éviter les états partiellement enregistrés ;
- un conflit peut être transformé en message fonctionnel compréhensible ;
- la stratégie est testable avec plusieurs opérations concurrentes.

## Conséquences positives

- Les doubles réservations sont empêchées au niveau de la persistance.
- Les réservations annulées, refusées ou expirées libèrent leur créneau.
- Les règles de disponibilité restent centralisées dans le service métier.
- Les échecs de concurrence peuvent être traités explicitement.
- Les notifications ne sont créées qu'après une opération métier réussie.

## Conséquences et limites

- Les transactions et la contrainte peuvent réduire la capacité sur les
  créneaux très sollicités.
- Les erreurs de conflit doivent être distinguées des erreurs techniques.
- Les périodes de maintenance doivent être vérifiées séparément, car elles ne
  sont pas couvertes par la contrainte d'exclusion des réservations.
- Des tests d'intégration avec PostgreSQL sont nécessaires.
- Les notifications et les journaux stockés dans MongoDB ne participent pas à
  la même transaction distribuée.

## Impact sur l'architecture

Le service de réservation orchestre la règle métier et la transaction via le
repository PostgreSQL. Les contrôleurs ne gèrent pas eux-mêmes la contrainte
ou la transaction.
