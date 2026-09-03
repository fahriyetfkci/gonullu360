CREATE TYPE "Role" AS ENUM ('ADMIN', 'VOLUNTEER');

ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_user_id_fkey";
ALTER TABLE "refresh_sessions" DROP CONSTRAINT "refresh_sessions_user_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";
ALTER TABLE "volunteers" DROP CONSTRAINT "volunteers_organization_id_fkey";
ALTER TABLE "events" DROP CONSTRAINT "events_organization_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organization_id_fkey";
ALTER TABLE "applications" DROP CONSTRAINT "applications_organization_id_fkey";
ALTER TABLE "volunteer_profiles" DROP CONSTRAINT "volunteer_profiles_manager_note_author_id_fkey";
ALTER TABLE "forms" DROP CONSTRAINT "forms_organization_id_fkey";
ALTER TABLE "forms" DROP CONSTRAINT "forms_created_by_fkey";
ALTER TABLE "form_versions" DROP CONSTRAINT "form_versions_published_by_fkey";
ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_submitted_by_fkey";

ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "organizations" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;
ALTER TABLE "users" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "volunteers" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "events" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "notifications" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "applications" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;
ALTER TABLE "forms" ALTER COLUMN "organization_id" TYPE TEXT USING "organization_id"::TEXT;

ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT;
ALTER TABLE "password_reset_tokens" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
ALTER TABLE "email_verification_tokens" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
ALTER TABLE "refresh_sessions" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
ALTER TABLE "notifications" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
ALTER TABLE "volunteer_profiles" ALTER COLUMN "manager_note_author_id" TYPE TEXT USING "manager_note_author_id"::TEXT;
ALTER TABLE "forms" ALTER COLUMN "created_by" TYPE TEXT USING "created_by"::TEXT;
ALTER TABLE "form_versions" ALTER COLUMN "published_by" TYPE TEXT USING "published_by"::TEXT;
ALTER TABLE "form_submissions" ALTER COLUMN "submitted_by" TYPE TEXT USING "submitted_by"::TEXT;

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING (
  CASE WHEN LOWER("role") IN ('yönetici', 'admin') THEN 'ADMIN'::"Role" ELSE 'VOLUNTEER'::"Role" END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VOLUNTEER';

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_manager_note_author_id_fkey" FOREIGN KEY ("manager_note_author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "forms" ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
