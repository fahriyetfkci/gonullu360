CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED', 'ARCHIVED');

ALTER TABLE "events"
  ADD COLUMN "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "starts_at" TIMESTAMP(3),
  ADD COLUMN "ends_at" TIMESTAMP(3),
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  ADD COLUMN "poster_storage_key" TEXT,
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "registration_form_id" INTEGER;

UPDATE "events"
SET "starts_at" = "date" + COALESCE("time", '09:00')::time,
    "ends_at" = "date" + COALESCE("end_time", "time", '10:00')::time,
    "status" = CASE WHEN "completed" THEN 'COMPLETED'::"EventStatus" ELSE 'SCHEDULED'::"EventStatus" END;

CREATE TABLE "event_groups" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "member_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_group_assignments" (
  "event_id" INTEGER NOT NULL,
  "group_id" TEXT NOT NULL,
  CONSTRAINT "event_group_assignments_pkey" PRIMARY KEY ("event_id", "group_id")
);

CREATE UNIQUE INDEX "event_groups_organization_id_name_key" ON "event_groups"("organization_id", "name");
CREATE INDEX "event_groups_organization_id_name_idx" ON "event_groups"("organization_id", "name");
CREATE INDEX "event_group_assignments_group_id_idx" ON "event_group_assignments"("group_id");
CREATE INDEX "events_organization_id_status_starts_at_idx" ON "events"("organization_id", "status", "starts_at");

INSERT INTO "event_groups" ("id", "organization_id", "name", "color", "member_count", "updated_at")
SELECT md5("id" || ':general'), "id", 'Genel', '#00a99d', 0, CURRENT_TIMESTAMP FROM "organizations";

INSERT INTO "event_group_assignments" ("event_id", "group_id")
SELECT e."id", md5(e."organization_id" || ':general') FROM "events" e;

ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_registration_form_id_fkey" FOREIGN KEY ("registration_form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_group_assignments" ADD CONSTRAINT "event_group_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_group_assignments" ADD CONSTRAINT "event_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "event_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
