-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BatchUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CallItemStatus" AS ENUM ('PENDING', 'SCHEDULED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "vapiCallId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'PENDING',
    "phoneNumber" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_uploads" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "totalCalls" INTEGER NOT NULL,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "failedCalls" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchUploadStatus" NOT NULL DEFAULT 'PENDING',
    "assistantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "batch_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_items" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "CallItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchUploadId" TEXT NOT NULL,
    "callId" TEXT,

    CONSTRAINT "call_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_vapiCallId_key" ON "calls"("vapiCallId");

-- CreateIndex
CREATE INDEX "calls_profileId_idx" ON "calls"("profileId");

-- CreateIndex
CREATE INDEX "calls_vapiCallId_idx" ON "calls"("vapiCallId");

-- CreateIndex
CREATE INDEX "batch_uploads_profileId_idx" ON "batch_uploads"("profileId");

-- CreateIndex
CREATE INDEX "call_items_batchUploadId_idx" ON "call_items"("batchUploadId");

-- CreateIndex
CREATE INDEX "call_items_callId_idx" ON "call_items"("callId");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_uploads" ADD CONSTRAINT "batch_uploads_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_items" ADD CONSTRAINT "call_items_batchUploadId_fkey" FOREIGN KEY ("batchUploadId") REFERENCES "batch_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_items" ADD CONSTRAINT "call_items_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
