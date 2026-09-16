-- Phase 5: make appointment types and appointments explicitly application-owned.
-- AvailabilitySchedule and AppointmentSlot inherit ownership through AppointmentType.
-- Existing appointment data is currently used by OBO, so ownership is backfilled
-- from the authoritative OBO App rather than from user identity.

ALTER TABLE `AppointmentType` ADD COLUMN `appId` VARCHAR(191) NULL;

UPDATE `AppointmentType` AS t
INNER JOIN `App` AS a ON a.`key` = 'obo'
SET t.`appId` = a.`id`
WHERE t.`appId` IS NULL;

-- Making the column required deliberately fails if any appointment type remains
-- unowned. Ownership must not be inferred from user identity.
ALTER TABLE `AppointmentType` MODIFY `appId` VARCHAR(191) NOT NULL;
CREATE INDEX `AppointmentType_appId_idx` ON `AppointmentType`(`appId`);
CREATE INDEX `AppointmentType_appId_isActive_idx` ON `AppointmentType`(`appId`, `isActive`);

ALTER TABLE `Appointment`
  ADD COLUMN `appId` VARCHAR(191) NULL;

UPDATE `Appointment` AS ap
INNER JOIN `AppointmentType` AS t ON t.`id` = ap.`appointmentTypeId`
SET ap.`appId` = t.`appId`
WHERE ap.`appId` IS NULL;

-- Making the column required deliberately fails if any appointment remains
-- unowned or references an invalid appointment type.
ALTER TABLE `Appointment` MODIFY `appId` VARCHAR(191) NOT NULL;
CREATE INDEX `Appointment_appId_idx` ON `Appointment`(`appId`);
CREATE INDEX `Appointment_appId_slotId_status_idx` ON `Appointment`(`appId`, `slotId`, `status`);
CREATE INDEX `Appointment_appId_userId_createdAt_idx` ON `Appointment`(`appId`, `userId`, `createdAt`);
CREATE INDEX `Appointment_appId_status_createdAt_idx` ON `Appointment`(`appId`, `status`, `createdAt`);
CREATE INDEX `Appointment_appId_appointmentTypeId_status_idx` ON `Appointment`(`appId`, `appointmentTypeId`, `status`);

ALTER TABLE `AppointmentType`
  ADD CONSTRAINT `AppointmentType_appId_fkey`
  FOREIGN KEY (`appId`) REFERENCES `App`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Appointment`
  ADD CONSTRAINT `Appointment_appId_fkey`
  FOREIGN KEY (`appId`) REFERENCES `App`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 13 decides whether currently-global identifiers should become
-- application-scoped unique constraints.
