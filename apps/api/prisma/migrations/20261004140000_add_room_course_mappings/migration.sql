CREATE TABLE "CadenzaRoomCourse" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenzaRoomCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CadenzaRoomCourse_roomId_courseId_key"
ON "CadenzaRoomCourse"("roomId", "courseId");

CREATE INDEX "CadenzaRoomCourse_appId_courseId_idx"
ON "CadenzaRoomCourse"("appId", "courseId");

ALTER TABLE "CadenzaRoomCourse"
ADD CONSTRAINT "CadenzaRoomCourse_appId_fkey"
FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaRoomCourse"
ADD CONSTRAINT "CadenzaRoomCourse_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "CadenzaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CadenzaRoomCourse"
ADD CONSTRAINT "CadenzaRoomCourse_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "CadenzaCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
