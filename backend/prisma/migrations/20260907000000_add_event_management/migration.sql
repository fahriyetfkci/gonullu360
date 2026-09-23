-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('IN_PERSON', 'ONLINE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT,
    "registrationFormId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "address" TEXT,
    "capacity" INTEGER,
    "contactInfo" TEXT,
    "description" TEXT,
    "posterUrl" TEXT,
    "posterStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGroupAssignment" (
    "eventId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "EventGroupAssignment_pkey" PRIMARY KEY ("eventId", "groupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_orgId_slug_key" ON "Event"("orgId", "slug");
CREATE INDEX "Event_orgId_startsAt_idx" ON "Event"("orgId", "startsAt");
CREATE INDEX "Event_orgId_status_startsAt_idx" ON "Event"("orgId", "status", "startsAt");
CREATE INDEX "Event_registrationFormId_idx" ON "Event"("registrationFormId");
CREATE UNIQUE INDEX "EventGroup_orgId_name_key" ON "EventGroup"("orgId", "name");
CREATE INDEX "EventGroup_orgId_name_idx" ON "EventGroup"("orgId", "name");
CREATE INDEX "EventGroupAssignment_groupId_idx" ON "EventGroupAssignment"("groupId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventGroupAssignment" ADD CONSTRAINT "EventGroupAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventGroupAssignment" ADD CONSTRAINT "EventGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
