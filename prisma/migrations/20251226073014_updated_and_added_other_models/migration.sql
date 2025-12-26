/*
  Warnings:

  - You are about to drop the column `completedAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "SlotOfferStatus" AS ENUM ('active', 'expired', 'booked', 'cancelled');

-- CreateEnum
CREATE TYPE "MeetingRequestStatus" AS ENUM ('pending', 'access_requested', 'access_granted', 'slots_offered', 'booked', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "MeetingSourceType" AS ENUM ('manual', 'telegram', 'calendar', 'recurring');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('confirmed', 'tentative', 'cancelled');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('confirmed', 'tentative', 'cancelled');

-- DropIndex
DROP INDEX "GroupMembership_groupId_idx";

-- DropIndex
DROP INDEX "GroupMembership_userId_idx";

-- DropIndex
DROP INDEX "Task_status_idx";

-- DropIndex
DROP INDEX "Task_userId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "completedAt",
ADD COLUMN     "completionDate" TIMESTAMP(3),
ADD COLUMN     "meetingMetadata" JSONB,
ALTER COLUMN "priority" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "accessTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "allowWeekendsDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "calendarConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultBufferTime" INTEGER DEFAULT 15,
ADD COLUMN     "defaultEarliestHour" INTEGER DEFAULT 9,
ADD COLUMN     "defaultLatestHour" INTEGER DEFAULT 17,
ADD COLUMN     "defaultMeetingDuration" INTEGER DEFAULT 30,
ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "lastCalendarSync" TIMESTAMP(3),
ADD COLUMN     "telegramChatId" TEXT;

-- CreateTable
CREATE TABLE "CalendarAccessRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "targetUserId" TEXT,
    "token" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "location" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "preferredDuration" INTEGER,
    "preferredTimeframe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotOffer" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "telegramMessageId" TEXT,
    "telegramChatId" TEXT NOT NULL,
    "offeredSlots" JSONB NOT NULL,
    "status" "SlotOfferStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "selectedSlotIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'confirmed',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "availableStart" TIMESTAMP(3) NOT NULL,
    "availableEnd" TIMESTAMP(3) NOT NULL,
    "slotDuration" INTEGER NOT NULL,
    "bufferBetween" INTEGER,
    "earliestHour" INTEGER NOT NULL,
    "latestHour" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "allowWeekends" BOOLEAN NOT NULL DEFAULT false,
    "allowBookingEdit" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slotOfferId" TEXT,
    "requesterUserId" TEXT NOT NULL,
    "accessRequestId" TEXT,
    "meetingId" TEXT,

    CONSTRAINT "MeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "groupId" TEXT,
    "organizerId" TEXT NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'confirmed',
    "googleEventId" TEXT,
    "sourceType" "MeetingSourceType" NOT NULL DEFAULT 'manual',
    "slotOfferId" TEXT,
    "externalAttendeeEmail" TEXT,
    "externalAttendeeName" TEXT,
    "reminderTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'pending',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarAccessRequest_token_key" ON "CalendarAccessRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_googleEventId_key" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startTime_endTime_idx" ON "CalendarEvent"("userId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarShareLink_token_key" ON "CalendarShareLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRequest_slotOfferId_key" ON "MeetingRequest"("slotOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRequest_meetingId_key" ON "MeetingRequest"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_slotOfferId_key" ON "Meeting"("slotOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_reminderTaskId_key" ON "Meeting"("reminderTaskId");

-- CreateIndex
CREATE INDEX "Meeting_groupId_startTime_idx" ON "Meeting"("groupId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");

-- AddForeignKey
ALTER TABLE "CalendarAccessRequest" ADD CONSTRAINT "CalendarAccessRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarAccessRequest" ADD CONSTRAINT "CalendarAccessRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotOffer" ADD CONSTRAINT "SlotOffer_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "CalendarAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarChannel" ADD CONSTRAINT "CalendarChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarShareLink" ADD CONSTRAINT "CalendarShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_slotOfferId_fkey" FOREIGN KEY ("slotOfferId") REFERENCES "SlotOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "CalendarAccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_slotOfferId_fkey" FOREIGN KEY ("slotOfferId") REFERENCES "SlotOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_reminderTaskId_fkey" FOREIGN KEY ("reminderTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
