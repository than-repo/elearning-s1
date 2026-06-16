SET @payment_user_course_unique_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND INDEX_NAME = 'payments_userId_courseId_key'
);

SET @drop_payment_user_course_unique_sql = IF(
  @payment_user_course_unique_exists > 0,
  'ALTER TABLE `payments` DROP INDEX `payments_userId_courseId_key`',
  'SELECT 1'
);

PREPARE drop_payment_user_course_unique_stmt FROM @drop_payment_user_course_unique_sql;
EXECUTE drop_payment_user_course_unique_stmt;
DEALLOCATE PREPARE drop_payment_user_course_unique_stmt;

SET @payment_user_course_index_exists = (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND INDEX_NAME = 'payments_userId_courseId_idx'
);

SET @create_payment_user_course_index_sql = IF(
  @payment_user_course_index_exists = 0,
  'CREATE INDEX `payments_userId_courseId_idx` ON `payments`(`userId`, `courseId`)',
  'SELECT 1'
);

PREPARE create_payment_user_course_index_stmt FROM @create_payment_user_course_index_sql;
EXECUTE create_payment_user_course_index_stmt;
DEALLOCATE PREPARE create_payment_user_course_index_stmt;
