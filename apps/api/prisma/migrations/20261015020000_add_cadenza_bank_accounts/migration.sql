CREATE TABLE "CadenzaBankAccount" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "qrStorageKey" TEXT NOT NULL,
    "qrMimeType" TEXT NOT NULL,
    "qrFileName" TEXT NOT NULL,
    "qrFileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CadenzaBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaBankAccount_appId_accountNumber_key" ON "CadenzaBankAccount"("appId", "accountNumber");
CREATE INDEX "CadenzaBankAccount_appId_status_idx" ON "CadenzaBankAccount"("appId", "status");
ALTER TABLE "CadenzaBankAccount" ADD CONSTRAINT "CadenzaBankAccount_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
