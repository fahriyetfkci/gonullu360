ALTER TABLE "volunteers" ALTER COLUMN "education" SET DEFAULT 'Ön Lisans';
ALTER TABLE "applications" ALTER COLUMN "education" SET DEFAULT 'Ön Lisans';

UPDATE "volunteers" SET "education" = 'Ön Lisans' WHERE "education" = 'Üniversite';
UPDATE "applications" SET "education" = 'Ön Lisans' WHERE "education" = 'Üniversite';
UPDATE "volunteer_educations" SET "level" = 'Ön Lisans' WHERE "level" = 'Üniversite';
