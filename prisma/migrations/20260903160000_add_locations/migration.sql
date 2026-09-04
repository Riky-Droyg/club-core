CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Group" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Training" ADD COLUMN "locationId" TEXT;
CREATE UNIQUE INDEX "Location_clubId_name_key" ON "Location"("clubId", "name");
CREATE INDEX "Location_clubId_isActive_idx" ON "Location"("clubId", "isActive");
CREATE INDEX "Group_locationId_idx" ON "Group"("locationId");
CREATE INDEX "Training_locationId_idx" ON "Training"("locationId");
ALTER TABLE "Location" ADD CONSTRAINT "Location_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Training" ADD CONSTRAINT "Training_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
