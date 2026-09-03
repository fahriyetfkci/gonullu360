CREATE TABLE "form_submission_files" (
    "id" TEXT NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "field_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_submission_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_submission_files_stored_name_key" ON "form_submission_files"("stored_name");
CREATE INDEX "form_submission_files_submission_id_idx" ON "form_submission_files"("submission_id");

ALTER TABLE "form_submission_files"
ADD CONSTRAINT "form_submission_files_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "form_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
