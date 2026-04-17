-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "cells" TEXT NOT NULL,
    "palette" TEXT NOT NULL,
    "beadCounts" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "thumbnail" TEXT,
    "ownerId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "videoTitle" TEXT,
    "patternId" TEXT NOT NULL,
    CONSTRAINT "Level_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "completedCells" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProgress_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "step" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "patternId" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Level_slug_key" ON "Level"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Level_patternId_key" ON "Level"("patternId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_patternId_key" ON "UserProgress"("userId", "patternId");
