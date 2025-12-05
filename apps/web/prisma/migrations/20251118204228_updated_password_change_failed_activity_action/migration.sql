/*
  Warnings:

  - The values [PASSWORD_CHANGED_FAILED] on the enum `ActivityAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityAction_new" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PROFILE_UPDATED', 'PASSWORD_CHANGED', 'PASSWORD_CHANGE_FAILED', 'ORDER_CREATED', 'ROLE_CHANGED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_ACTIVATED', 'USER_CREATED', 'SECURITY_ALERT_DISMISSED');
ALTER TABLE "ActivityLog" ALTER COLUMN "action" TYPE "ActivityAction_new" USING ("action"::text::"ActivityAction_new");
ALTER TYPE "ActivityAction" RENAME TO "ActivityAction_old";
ALTER TYPE "ActivityAction_new" RENAME TO "ActivityAction";
DROP TYPE "public"."ActivityAction_old";
COMMIT;
