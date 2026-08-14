-- Add refresh-token rotation linkage.
ALTER TABLE "RefreshToken"
ADD COLUMN "replacedByTokenId" TEXT;

-- A replacement token can be referenced by at most one previous token.
CREATE UNIQUE INDEX "RefreshToken_replacedByTokenId_key"
ON "RefreshToken"("replacedByTokenId");

CREATE INDEX "RefreshToken_replacedByTokenId_idx"
ON "RefreshToken"("replacedByTokenId");

-- Link the consumed refresh token to the token that replaced it.
ALTER TABLE "RefreshToken"
ADD CONSTRAINT "RefreshToken_replacedByTokenId_fkey"
FOREIGN KEY ("replacedByTokenId")
REFERENCES "RefreshToken"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
