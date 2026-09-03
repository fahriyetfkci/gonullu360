-- PostgreSQL başlangıç şeması. Bu migration boş bir veritabanını tek başına kurar.

CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "backup_codes_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_token_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "volunteers" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "education" TEXT NOT NULL DEFAULT 'Üniversite',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_participants" (
    "id" SERIAL NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
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
    "manager_note_author_id" INTEGER,
    "manager_note_updated_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("volunteer_id")
);

CREATE TABLE "volunteer_interests" (
    "volunteer_id" INTEGER NOT NULL,
    "interest" TEXT NOT NULL,
    CONSTRAINT "volunteer_interests_pkey" PRIMARY KEY ("volunteer_id", "interest")
);

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

CREATE TABLE "forms" (
    "id" SERIAL NOT NULL,
    "client_form_id" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draft_schema" JSONB NOT NULL,
    "draft_revision" INTEGER NOT NULL DEFAULT 1,
    "current_version" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_versions" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_json" JSONB NOT NULL,
    "published_by" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_submissions" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "form_version" INTEGER NOT NULL,
    "answers_json" JSONB NOT NULL,
    "submitted_by" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");
CREATE INDEX "refresh_sessions_user_id_expires_at_idx" ON "refresh_sessions"("user_id", "expires_at");
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE INDEX "volunteers_created_at_idx" ON "volunteers"("created_at");
CREATE INDEX "volunteers_city_idx" ON "volunteers"("city");
CREATE INDEX "volunteers_active_created_at_idx" ON "volunteers"("active", "created_at");
CREATE INDEX "volunteers_organization_id_created_at_idx" ON "volunteers"("organization_id", "created_at");
CREATE INDEX "volunteers_organization_id_city_idx" ON "volunteers"("organization_id", "city");
CREATE INDEX "volunteers_organization_id_gender_idx" ON "volunteers"("organization_id", "gender");
CREATE INDEX "volunteers_organization_id_age_idx" ON "volunteers"("organization_id", "age");
CREATE INDEX "volunteers_organization_id_active_created_at_idx" ON "volunteers"("organization_id", "active", "created_at");
CREATE INDEX "events_date_idx" ON "events"("date");
CREATE INDEX "events_completed_date_idx" ON "events"("completed", "date");
CREATE INDEX "events_organization_id_date_idx" ON "events"("organization_id", "date");
CREATE INDEX "events_organization_id_completed_date_idx" ON "events"("organization_id", "completed", "date");
CREATE INDEX "event_participants_volunteer_id_idx" ON "event_participants"("volunteer_id");
CREATE INDEX "event_participants_event_id_idx" ON "event_participants"("event_id");
CREATE UNIQUE INDEX "event_participants_volunteer_id_event_id_key" ON "event_participants"("volunteer_id", "event_id");
CREATE INDEX "notifications_user_id_read_created_at_idx" ON "notifications"("user_id", "read", "created_at");
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");
CREATE INDEX "applications_created_at_idx" ON "applications"("created_at");
CREATE INDEX "applications_status_created_at_idx" ON "applications"("status", "created_at");
CREATE INDEX "applications_city_idx" ON "applications"("city");
CREATE INDEX "applications_organization_id_created_at_idx" ON "applications"("organization_id", "created_at");
CREATE INDEX "applications_organization_id_status_created_at_idx" ON "applications"("organization_id", "status", "created_at");
CREATE INDEX "applications_organization_id_city_idx" ON "applications"("organization_id", "city");
CREATE UNIQUE INDEX "volunteer_profiles_volunteer_code_key" ON "volunteer_profiles"("volunteer_code");
CREATE INDEX "volunteer_interests_interest_idx" ON "volunteer_interests"("interest");
CREATE INDEX "volunteer_educations_volunteer_id_current_idx" ON "volunteer_educations"("volunteer_id", "current");
CREATE INDEX "forms_status_updated_at_idx" ON "forms"("status", "updated_at");
CREATE INDEX "forms_organization_id_updated_at_idx" ON "forms"("organization_id", "updated_at");
CREATE INDEX "forms_created_by_updated_at_idx" ON "forms"("created_by", "updated_at");
CREATE UNIQUE INDEX "forms_organization_id_client_form_id_key" ON "forms"("organization_id", "client_form_id");
CREATE INDEX "form_versions_form_id_published_at_idx" ON "form_versions"("form_id", "published_at");
CREATE UNIQUE INDEX "form_versions_form_id_version_key" ON "form_versions"("form_id", "version");
CREATE INDEX "form_submissions_form_id_submitted_at_idx" ON "form_submissions"("form_id", "submitted_at");
CREATE INDEX "form_submissions_submitted_by_submitted_at_idx" ON "form_submissions"("submitted_by", "submitted_at");

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_manager_note_author_id_fkey" FOREIGN KEY ("manager_note_author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "volunteer_interests" ADD CONSTRAINT "volunteer_interests_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "volunteer_educations" ADD CONSTRAINT "volunteer_educations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forms" ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
