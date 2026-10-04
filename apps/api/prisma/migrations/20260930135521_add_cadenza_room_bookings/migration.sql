-- CreateTable
CREATE TABLE "CadenzaRoomBooking" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenzaRoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_roomId_scheduledStart_scheduledEnd_idx" ON "CadenzaRoomBooking"("appId", "roomId", "scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_customerId_status_idx" ON "CadenzaRoomBooking"("appId", "customerId", "status");

-- CreateIndex
CREATE INDEX "CadenzaRoomBooking_appId_status_scheduledStart_idx" ON "CadenzaRoomBooking"("appId", "status", "scheduledStart");

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CadenzaCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenzaRoomBooking" ADD CONSTRAINT "CadenzaRoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
