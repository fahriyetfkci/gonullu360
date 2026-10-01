ALTER TABLE "users"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "job_title" TEXT,
  ADD COLUMN "about" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "photo_url" TEXT,
  ADD COLUMN "email_notifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "system_notifications" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "events"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "end_time" TEXT,
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'IN_PERSON',
  ADD COLUMN "address" TEXT,
  ADD COLUMN "capacity" INTEGER,
  ADD COLUMN "contact_info" TEXT,
  ADD COLUMN "description" TEXT;

CREATE UNIQUE INDEX "events_organization_id_slug_key" ON "events"("organization_id", "slug");
