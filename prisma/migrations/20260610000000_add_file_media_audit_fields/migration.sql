ALTER TABLE `file_media`
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `file_media_lessonId_idx` ON `file_media`(`lessonId`);
CREATE INDEX `file_media_type_idx` ON `file_media`(`type`);
CREATE INDEX `file_media_deletedAt_idx` ON `file_media`(`deletedAt`);
