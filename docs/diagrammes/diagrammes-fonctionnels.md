# Diagrammes fonctionnels — L'Escale

## Diagramme de cas d'utilisation

```mermaid
flowchart LR
    V[Visiteur]
    M[Adhérent]
    G[Gestionnaire]
    A[Administrateur]

    C((Consulter le catalogue))
    R((Rechercher une ressource))
    L((Se connecter))
    B((Demander une réservation))
    MR((Consulter ses réservations))
    AN((Annuler une réservation))
    N((Consulter ses notifications))
    T((Traiter une demande))
    GR((Gérer les ressources))
    MA((Déclarer une maintenance))
    GC((Gérer les comptes))
    J((Consulter le journal d'activité))

    V --> C
    V --> R
    V --> L

    M --> L
    M --> B
    M --> MR
    M --> AN
    M --> N

    G --> L
    G --> T
    G --> AN
    G --> GR
    G --> MA
    G --> J

    A --> L
    A --> T
    A --> AN
    A --> GR
    A --> MA
    A --> GC
    A --> J
```

## Séquence — Demander une réservation

```mermaid
sequenceDiagram
    actor Adhérent
    participant UI as Interface
    participant C as Contrôleur
    participant S as Service de réservation
    participant R as Repository PostgreSQL
    participant N as Repository notifications

    Adhérent->>UI: Saisir la ressource et le créneau
    UI->>C: Envoyer la demande
    C->>C: Vérifier la session et valider les données
    C->>S: Demander la réservation
    S->>R: Vérifier les règles et la disponibilité
    R-->>S: Disponibilité et contraintes

    alt Créneau indisponible ou règle non respectée
        S-->>C: Refus motivé
        C-->>UI: Afficher le motif du refus
    else Ressource sans validation
        S->>R: Créer la réservation confirmée
        R-->>S: Réservation enregistrée
        S->>N: Créer une notification
        N-->>S: Notification enregistrée
        S-->>C: Réservation confirmée
        C-->>UI: Afficher la confirmation
    else Ressource avec validation
        S->>R: Créer la demande en attente
        R-->>S: Demande enregistrée
        S->>N: Créer une notification
        N-->>S: Notification enregistrée
        S-->>C: Demande en attente
        C-->>UI: Afficher le statut de la demande
    end
```

## Séquence — Traiter une demande de réservation

```mermaid
sequenceDiagram
    actor Gestionnaire
    participant UI as Interface
    participant C as Contrôleur
    participant S as Service de réservation
    participant R as Repository PostgreSQL
    participant N as Repository notifications
    participant J as Repository journal

    Gestionnaire->>UI: Ouvrir une demande en attente
    UI->>C: Demander le détail
    C->>C: Vérifier la session et le rôle
    C->>S: Charger la demande
    S->>R: Rechercher la réservation
    R-->>S: Détail de la demande
    S-->>C: Demande accessible
    C-->>UI: Afficher le détail

    alt Valider la demande
        Gestionnaire->>UI: Cliquer sur Valider
        UI->>C: Confirmer la validation
        C->>S: Valider la demande
        S->>R: Vérifier la disponibilité et mettre à jour le statut
        R-->>S: Demande confirmée
        S->>N: Notifier l'adhérent
        S->>J: Journaliser la validation
        S-->>C: Validation réussie
        C-->>UI: Afficher la confirmation
    else Refuser la demande
        Gestionnaire->>UI: Saisir un motif et cliquer sur Refuser
        UI->>C: Envoyer le motif
        C->>C: Vérifier que le motif est renseigné
        C->>S: Refuser la demande
        S->>R: Enregistrer le refus et le motif
        R-->>S: Demande refusée
        S->>N: Notifier l'adhérent
        S->>J: Journaliser le refus
        S-->>C: Refus enregistré
        C-->>UI: Afficher la confirmation
    end
```

## Règles de représentation

- Les acteurs représentent les profils fonctionnels de l'application.
- Les contrôleurs vérifient l'authentification, les rôles et les données
  entrantes.
- Les services appliquent les règles métier.
- Les repositories sont les seuls composants qui accèdent aux bases de données.
- Les notifications et le journal sont enregistrés après la réussite de
  l'opération métier principale.
