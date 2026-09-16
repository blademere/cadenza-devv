-- Phase 4: make shared tasks explicitly application-owned.
-- Ownership is inherited from the authoritative CaseRecord relationship.

ALTER TABLE `Task` ADD COLUMN `appId` VARCHAR(191) NULL;

UPDATE `Task` AS t
INNER JOIN `CaseRecord` AS c ON c.`id` = t.`caseId`
SET t.`appId` = c.`appId`
WHERE t.`appId` IS NULL;

-- Tasks without a case have no authoritative application owner in the
-- current model. Do not guess ownership from users or other indirect data.
SET @unowned_task_count = (SELECT COUNT(*) FROM `Task` WHERE `appId` IS NULL);
SET @unowned_task_error = IF(@unowned_task_count = 0, NULL,
  CONCAT('Phase 4 migration blocked: ', @unowned_task_count,
         ' task(s) have no case and therefore no authoritative application owner.'));
DO CASE
  WHEN @unowned_task_count > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = @unowned_task_error;
END CASE;

ALTER TABLE `Task` MODIFY `appId` VARCHAR(191) NOT NULL;

CREATE INDEX `Task_appId_idx` ON `Task`(`appId`);
CREATE INDEX `Task_appId_caseId_status_idx` ON `Task`(`appId`, `caseId`, `status`);
CREATE INDEX `Task_appId_assigneeUserId_status_idx` ON `Task`(`appId`, `assigneeUserId`, `status`);
CREATE INDEX `Task_appId_status_dueAt_idx` ON `Task`(`appId`, `status`, `dueAt`);

ALTER TABLE `Task`
  ADD CONSTRAINT `Task_appId_fkey`
  FOREIGN KEY (`appId`) REFERENCES `App`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Guard against assigning a task to a case owned by another application.
-- The service/repository enforces this before writes; a composite FK is not
-- added here because caseId is nullable and the existing relation is retained.
