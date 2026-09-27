CREATE TABLE "event_reports" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "achievements" TEXT NOT NULL DEFAULT '',
    "issues" TEXT NOT NULL DEFAULT '',
    "manager_evaluation" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_reports_event_id_key" ON "event_reports"("event_id");
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
