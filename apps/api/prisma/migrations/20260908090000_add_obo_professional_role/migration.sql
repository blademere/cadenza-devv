ALTER TABLE "OboProfessional"
ADD COLUMN "professionalRole" TEXT;

CREATE INDEX "OboProfessional_professionalRole_idx"
ON "OboProfessional"("professionalRole");
