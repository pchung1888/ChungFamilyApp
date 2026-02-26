-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
