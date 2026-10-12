-- Contraintes d'intégrité que Prisma ne sait pas déclarer dans le schéma (ADR 001 et ADR 004).

-- Nécessaire pour combiner l'égalité (resource_id) et le chevauchement d'intervalles dans une contrainte d'exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Un créneau a un début strictement antérieur à sa fin.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_period_check" CHECK ("starts_at" < "ends_at");

ALTER TABLE "maintenance_periods"
  ADD CONSTRAINT "maintenance_periods_period_check" CHECK ("starts_at" < "ends_at");

-- Un refus est toujours accompagné d'un motif (R6).
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_rejection_reason_check"
  CHECK ("status" <> 'REJECTED' OR ("decision_reason" IS NOT NULL AND length(btrim("decision_reason")) > 0));

-- Deux réservations actives (en attente ou confirmées) d'une même ressource ne se chevauchent jamais, même
-- si deux adhérents réservent exactement au même moment (B04). Les intervalles sont semi-ouverts :
-- un créneau peut commencer à l'instant où le précédent se termine.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "resource_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));

-- La capacité, si elle est renseignée, est strictement positive.
ALTER TABLE "resources"
  ADD CONSTRAINT "resources_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0);
