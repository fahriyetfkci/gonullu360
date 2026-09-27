ALTER TABLE "education_institution_stats"
ADD COLUMN "student_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sync_status" TEXT NOT NULL DEFAULT 'success',
ADD COLUMN "sync_error" TEXT,
ADD COLUMN "last_attempt_at" TIMESTAMP(3);

UPDATE "education_institution_stats"
SET "last_attempt_at" = "synced_at";
