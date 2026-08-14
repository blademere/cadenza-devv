-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
