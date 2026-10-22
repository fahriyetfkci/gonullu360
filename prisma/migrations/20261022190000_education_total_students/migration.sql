ALTER TABLE "education_institution_stats"
ADD COLUMN "meb_student_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "higher_education_student_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "education_institution_stats"
SET "meb_student_count" = "student_count";
