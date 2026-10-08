# ADR 003 — Stockage des données transversales dans MongoDB

## Contexte

L'application utilise PostgreSQL pour les données métier structurées et doit
également gérer des notifications ainsi qu'un journal d'activité. Ces données
ont des besoins différents des réservations et des ressources :

- leur structure peut évoluer selon les événements enregistrés ;
- elles sont consultées principalement par utilisateur, date ou type d'action ;
- le journal possède une durée de conservation limitée ;
- elles ne doivent pas créer de dépendances relationnelles fortes avec le
  modèle métier PostgreSQL.

Le cahier des charges impose l'utilisation de MongoDB pour ces données
transversales.

## Décision

Les notifications et le journal d'activité sont stockés dans MongoDB, dans
deux collections distinctes :

- `notifications` ;
- `activity_logs`.

PostgreSQL reste la source de vérité pour les utilisateurs, les ressources,
les réservations et les périodes de maintenance.

Les documents MongoDB référencent les entités PostgreSQL avec leurs
identifiants sous forme de chaînes. Ces références sont applicatives et ne
constituent pas des relations SQL ou des clés étrangères.

## Raisons du choix

- respect de la contrainte technique du cahier des charges ;
- séparation entre les données métier transactionnelles et les données
  transversales ;
- souplesse du champ `metadata` du journal ;
- possibilité de faire évoluer les types de notifications sans modifier le
  schéma relationnel principal ;
- adéquation avec des consultations par utilisateur, date et type d'événement ;
- suppression automatique des journaux arrivés à leur durée de conservation.

La collection `activity_logs` possède un index TTL sur `createdAt` configuré
pour supprimer automatiquement les documents après un an. Cette durée
correspond à l'exigence de conservation du journal d'activité. La création et
la vérification de cet index seront couvertes par la configuration du
repository MongoDB.

## Conséquences positives

- Le modèle relationnel reste centré sur les invariants métier.
- Les métadonnées de journalisation peuvent varier selon l'action.
- Les repositories PostgreSQL et MongoDB restent indépendants.
- La purge du journal peut être mise en œuvre séparément, notamment avec un
  index TTL si cela est retenu lors de l'implémentation.

## Conséquences et limites

- MongoDB ne garantit pas l'intégrité référentielle avec PostgreSQL.
- Les repositories doivent valider les identifiants et les données avant
  l'écriture.
- Une opération métier et la création d'une notification ne forment pas
  automatiquement une transaction distribuée.
- L'index TTL supprime automatiquement les journaux après un an ; une
  surveillance de sa présence reste nécessaire lors du déploiement.

## Impact sur l'architecture

Les services métier utilisent des repositories dédiés. Ils ne manipulent pas
directement le client MongoDB.

```text
Services métier
    ↓
Repositories MongoDB
    ↓
MongoDB
```
