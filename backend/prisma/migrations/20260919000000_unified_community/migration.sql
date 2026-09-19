-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Yönetici';

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formVersion" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "FormSubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" SERIAL NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "education" TEXT NOT NULL DEFAULT 'Üniversite',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "education" TEXT NOT NULL DEFAULT 'Üniversite',
    "status" TEXT NOT NULL DEFAULT 'İşlem Bekliyor',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "interests" TEXT,
    "cover_letter" TEXT,
    "evaluation_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_profiles" (
    "volunteer_id" INTEGER NOT NULL,
    "volunteer_code" TEXT,
    "birth_date" DATE,
    "department" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "photo_url" TEXT,
    "manager_note" TEXT,
    "cover_letter" TEXT,
    "volunteering_target" INTEGER NOT NULL DEFAULT 80,
    "participation_target" INTEGER NOT NULL DEFAULT 70,
    "manager_note_author_id" TEXT,
    "manager_note_updated_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("volunteer_id")
);

-- CreateTable
CREATE TABLE "volunteer_interests" (
    "volunteer_id" INTEGER NOT NULL,
    "interest" TEXT NOT NULL,

    CONSTRAINT "volunteer_interests_pkey" PRIMARY KEY ("volunteer_id","interest")
);

-- CreateTable
CREATE TABLE "volunteer_educations" (
    "id" SERIAL NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "department" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "current" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "volunteer_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" SERIAL NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormSubmission_formId_submittedAt_idx" ON "FormSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmissionFile_submissionId_idx" ON "FormSubmissionFile"("submissionId");

-- CreateIndex
CREATE INDEX "volunteers_created_at_idx" ON "volunteers"("created_at");

-- CreateIndex
CREATE INDEX "volunteers_city_idx" ON "volunteers"("city");

-- CreateIndex
CREATE INDEX "volunteers_active_created_at_idx" ON "volunteers"("active", "created_at");

-- CreateIndex
CREATE INDEX "volunteers_organization_id_created_at_idx" ON "volunteers"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "volunteers_organization_id_city_idx" ON "volunteers"("organization_id", "city");

-- CreateIndex
CREATE INDEX "volunteers_organization_id_gender_idx" ON "volunteers"("organization_id", "gender");

-- CreateIndex
CREATE INDEX "volunteers_organization_id_age_idx" ON "volunteers"("organization_id", "age");

-- CreateIndex
CREATE INDEX "volunteers_organization_id_active_created_at_idx" ON "volunteers"("organization_id", "active", "created_at");

-- CreateIndex
CREATE INDEX "applications_created_at_idx" ON "applications"("created_at");

-- CreateIndex
CREATE INDEX "applications_status_created_at_idx" ON "applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "applications_city_idx" ON "applications"("city");

-- CreateIndex
CREATE INDEX "applications_organization_id_created_at_idx" ON "applications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_organization_id_status_created_at_idx" ON "applications"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "applications_organization_id_city_idx" ON "applications"("organization_id", "city");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_profiles_volunteer_code_key" ON "volunteer_profiles"("volunteer_code");

-- CreateIndex
CREATE INDEX "volunteer_interests_interest_idx" ON "volunteer_interests"("interest");

-- CreateIndex
CREATE INDEX "volunteer_educations_volunteer_id_current_idx" ON "volunteer_educations"("volunteer_id", "current");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_created_at_idx" ON "notifications"("user_id", "read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "event_participants_volunteer_id_idx" ON "event_participants"("volunteer_id");

-- CreateIndex
CREATE INDEX "event_participants_event_id_idx" ON "event_participants"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_volunteer_id_event_id_key" ON "event_participants"("volunteer_id", "event_id");

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmissionFile" ADD CONSTRAINT "FormSubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_manager_note_author_id_fkey" FOREIGN KEY ("manager_note_author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_interests" ADD CONSTRAINT "volunteer_interests_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_educations" ADD CONSTRAINT "volunteer_educations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

