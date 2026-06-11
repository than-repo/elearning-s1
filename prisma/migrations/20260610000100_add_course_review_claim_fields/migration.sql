-- Add reviewer claim state for pool-based course reviews.
ALTER TABLE `courses`
  ADD COLUMN `reviewClaimedById` VARCHAR(191) NULL,
  ADD COLUMN `reviewClaimedAt` DATETIME(3) NULL;

CREATE INDEX `courses_status_reviewClaimedById_idx` ON `courses`(`status`, `reviewClaimedById`);
CREATE INDEX `courses_reviewClaimedById_idx` ON `courses`(`reviewClaimedById`);

ALTER TABLE `courses`
  ADD CONSTRAINT `courses_reviewClaimedById_fkey`
  FOREIGN KEY (`reviewClaimedById`)
  REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
