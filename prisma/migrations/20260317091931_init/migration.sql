-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isAnonymousDefault" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "moodLevel" INTEGER NOT NULL,
    "moodLabel" TEXT NOT NULL,
    "freeText" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "sentiment" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoodReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moodEntryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    CONSTRAINT "MoodReason_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "MoodEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrgEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_slackUserId_key" ON "Employee"("slackUserId");
