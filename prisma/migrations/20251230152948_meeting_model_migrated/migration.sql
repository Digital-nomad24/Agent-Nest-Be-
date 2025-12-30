/*
  Warnings:

  - A unique constraint covering the columns `[googleEventId]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Meeting_googleEventId_key" ON "Meeting"("googleEventId");
