ALTER TABLE "events"
ADD COLUMN "time" TEXT DEFAULT '13:00',
ADD COLUMN "group_name" TEXT,
ADD COLUMN "image_url" TEXT,
ADD COLUMN "notes" TEXT;

CREATE TABLE "event_tasks" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_tasks_event_id_position_idx" ON "event_tasks"("event_id", "position");
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
