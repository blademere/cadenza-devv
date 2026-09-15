CREATE TABLE "App" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "App_key_key" ON "App"("key");

CREATE TABLE "AppMembership" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppMembership_appId_userId_key"
  ON "AppMembership"("appId", "userId");

CREATE INDEX "AppMembership_userId_idx" ON "AppMembership"("userId");
CREATE INDEX "AppMembership_appId_idx" ON "AppMembership"("appId");

CREATE TABLE "AppMembershipRole" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "roleId" INTEGER NOT NULL,

  CONSTRAINT "AppMembershipRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppMembershipRole_membershipId_roleId_key"
  ON "AppMembershipRole"("membershipId", "roleId");

CREATE INDEX "AppMembershipRole_membershipId_idx" ON "AppMembershipRole"("membershipId");
CREATE INDEX "AppMembershipRole_roleId_idx" ON "AppMembershipRole"("roleId");

ALTER TABLE "AppMembership"
  ADD CONSTRAINT "AppMembership_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppMembership"
  ADD CONSTRAINT "AppMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppMembershipRole"
  ADD CONSTRAINT "AppMembershipRole_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "AppMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppMembershipRole"
  ADD CONSTRAINT "AppMembershipRole_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
